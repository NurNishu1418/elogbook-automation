import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { logger } from '../utils/logger';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn, LoginBlockedError } from '../auth/login';
import { formUrl, env } from '../utils/env';
import { readDataEntryRows, readExistingUploadResults, DataEntryRow } from './excelReader';
import { validateRow, LeafForValidation } from './validateRow';
import { fillAndSaveDraft } from './fillForm';
import { fetchRecentEntries, findMatchingEntry, compareEntryToRow, PortalEntry } from './verifyEntrySaved';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DATASET_DIR = path.join(PROJECT_ROOT, 'generated-data', 'Basic-Surgical-Skill');
const DATASET_XLSX_PATH = path.join(DATASET_DIR, 'BCPS_Logbook_Basic_Surgical_Skill_TestData.xlsx');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, 'screenshots', 'errors');
const CONSECUTIVE_FAILURE_STOP_THRESHOLD = 3;

interface RowResult {
  externalRowId: string;
  excelRow: number;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED_DUPLICATE' | 'SKIPPED_INVALID';
  draftReference: string;
  attemptTime: string;
  failedField: string;
  errorMessage: string;
  screenshotPath: string;
}

function writeProgress(state: any) {
  fs.writeFileSync(path.join(DATASET_DIR, 'upload-progress.json'), JSON.stringify(state, null, 2), 'utf-8');
}

async function appendUploadResults(rows: RowResult[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(DATASET_XLSX_PATH);
  const ws = wb.getWorksheet('UploadResult');
  if (!ws) throw new Error('UploadResult sheet not found in dataset workbook.');
  for (const r of rows) {
    ws.addRow([r.externalRowId, r.excelRow, r.status, r.draftReference, r.attemptTime, r.failedField, r.errorMessage, r.screenshotPath]);
  }
  await wb.xlsx.writeFile(DATASET_XLSX_PATH);
}

async function main() {
  logger.info('=== Basic Surgical Skill dataset upload: EXECUTE mode (Save as Draft only) ===');

  const formMap = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'form-map.json'), 'utf-8'));
  const leaves: LeafForValidation[] = formMap.leaves.map((l: any) => ({
    leafId: l.leafId,
    pathLabels: l.pathLabels,
    fields: l.fields ?? [],
    competencyGroup: l.competencyGroup ?? [],
  }));

  const allRows = await readDataEntryRows(DATASET_XLSX_PATH);
  const draftRows = allRows.filter((r) => r.action === 'SAVE_DRAFT');
  const validationResults = draftRows.map((row) => ({ row, result: validateRow(row, leaves) }));
  const validRows = validationResults.filter((v) => v.result.valid);
  logger.info(`${draftRows.length} SAVE_DRAFT row(s) found, ${validRows.length} passed local validation (only these are eligible).`);

  const alreadyDoneLocally = await readExistingUploadResults(DATASET_XLSX_PATH);
  logger.info(`${alreadyDoneLocally.size} row(s) already recorded as SUCCESS in this workbook's UploadResult sheet - will be skipped.`);

  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  const results: RowResult[] = [];
  let consecutiveFailures = 0;
  let stoppedForSystemicIssue = false;

  try {
    let loginResult;
    try {
      loginResult = await ensureLoggedIn(page);
    } catch (err) {
      if (err instanceof LoginBlockedError) {
        logger.error(`BLOCKED: ${err.message}`);
        process.exitCode = 2;
        return;
      }
      throw err;
    }
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      process.exitCode = 2;
      return;
    }
    logger.info('Login confirmed.');

    logger.info('Fetching existing portal entries for duplicate pre-check (read-only, up to 300 recent entries)...');
    let portalEntries: PortalEntry[] = await fetchRecentEntries(page, 15, 20);
    logger.info(`Fetched ${portalEntries.length} existing entries from the portal for duplicate comparison.`);

    let eligibleRows = validRows.filter((v) => !alreadyDoneLocally.has(v.row.externalRowId));
    logger.info(`${eligibleRows.length} row(s) remain to process after local-skip filtering.`);
    const canaryLimit = process.env.CANARY_LIMIT ? parseInt(process.env.CANARY_LIMIT, 10) : null;
    if (canaryLimit) {
      eligibleRows = eligibleRows.slice(0, canaryLimit);
      logger.info(`CANARY_LIMIT=${canaryLimit} set - only processing the first ${eligibleRows.length} row(s) this run.`);
    }

    for (let i = 0; i < eligibleRows.length; i++) {
      const { row, result } = eligibleRows[i];
      const leaf = result.resolvedLeaf!;
      const now = new Date().toISOString();

      const existing = findMatchingEntry(portalEntries, row, leaf);
      if (existing) {
        logger.info(`[${i + 1}/${eligibleRows.length}] ${row.externalRowId}: SKIPPED_DUPLICATE (already exists as portal entry ${existing.id})`);
        results.push({
          externalRowId: row.externalRowId,
          excelRow: row.excelRow,
          status: 'SKIPPED_DUPLICATE',
          draftReference: existing.id,
          attemptTime: now,
          failedField: '',
          errorMessage: '',
          screenshotPath: '',
        });
        consecutiveFailures = 0;
        continue;
      }

      logger.info(`[${i + 1}/${eligibleRows.length}] Processing ${row.externalRowId}: ${leaf.pathLabels.join(' > ')} | ${row.nameOfPatient} | RegNo=${row.patientRegNo}`);

      let rowResult: RowResult;
      try {
        await page.goto(formUrl(), { waitUntil: 'domcontentloaded' });
        const sessionExpired = page.url().includes(env.loginPath) || (await page.$('input[name="password"]')) !== null;
        if (sessionExpired) {
          logger.info('  Session appears to have expired mid-run; re-logging in and retrying this row...');
          const relogin = await ensureLoggedIn(page);
          if (!relogin.success) {
            throw new Error(`Re-login after session expiry failed: ${relogin.reason}`);
          }
          await page.goto(formUrl(), { waitUntil: 'domcontentloaded' });
        }
        const fillResult = await fillAndSaveDraft(page, row, leaf);

        if (!fillResult.success && fillResult.failedField) {
          // Failed before ever reaching a save (bad selector/control) - nothing was persisted.
          const screenshotPath = path.join(SCREENSHOTS_DIR, `bss-${row.externalRowId}-${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
          rowResult = {
            externalRowId: row.externalRowId,
            excelRow: row.excelRow,
            status: 'FAILED',
            draftReference: '',
            attemptTime: now,
            failedField: fillResult.failedField,
            errorMessage: fillResult.error ?? 'Unknown error',
            screenshotPath,
          };
        } else {
          // Whether or not fillAndSaveDraft's own heuristic thought it
          // succeeded, the portal's own entry list is the source of truth.
          let matched: PortalEntry | null = null;
          for (let attempt = 0; attempt < 4 && !matched; attempt++) {
            if (attempt > 0) await page.waitForTimeout(1500);
            const freshPage1 = await fetchRecentEntries(page, 1, 20);
            matched = findMatchingEntry(freshPage1, row, leaf);
          }

          if (!matched) {
            const screenshotPath = path.join(SCREENSHOTS_DIR, `bss-${row.externalRowId}-${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
            rowResult = {
              externalRowId: row.externalRowId,
              excelRow: row.excelRow,
              status: 'FAILED',
              draftReference: '',
              attemptTime: now,
              failedField: '',
              errorMessage: `No matching entry found in the portal's own list after Save as Draft (fillAndSaveDraft reported success=${fillResult.success}).`,
              screenshotPath,
            };
          } else {
            const comparison = compareEntryToRow(matched, row, leaf);
            portalEntries.unshift(matched); // keep local duplicate map current
            if (comparison.matches) {
              logger.info(`  VERIFIED: saved entry ${matched.id} matches all submitted fields.`);
              rowResult = {
                externalRowId: row.externalRowId,
                excelRow: row.excelRow,
                status: 'SUCCESS',
                draftReference: matched.id,
                attemptTime: now,
                failedField: '',
                errorMessage: '',
                screenshotPath: '',
              };
            } else {
              const screenshotPath = path.join(SCREENSHOTS_DIR, `bss-${row.externalRowId}-${Date.now()}.png`);
              await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
              logger.error(`  MISMATCH on entry ${matched.id}: ${comparison.mismatches.join(' | ')}`);
              rowResult = {
                externalRowId: row.externalRowId,
                excelRow: row.excelRow,
                status: 'FAILED',
                draftReference: matched.id,
                attemptTime: now,
                failedField: '',
                errorMessage: `Post-save verification mismatch (draft ${matched.id} exists but does not match submitted data): ${comparison.mismatches.join(' | ')}`,
                screenshotPath,
              };
            }
          }
        }
      } catch (err: any) {
        const screenshotPath = path.join(SCREENSHOTS_DIR, `bss-${row.externalRowId}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
        rowResult = {
          externalRowId: row.externalRowId,
          excelRow: row.excelRow,
          status: 'FAILED',
          draftReference: '',
          attemptTime: now,
          failedField: '',
          errorMessage: `Exception: ${err?.message ?? err}`,
          screenshotPath,
        };
      }

      results.push(rowResult);
      if (rowResult.status === 'SUCCESS') {
        consecutiveFailures = 0;
        logger.info(`[${i + 1}/${eligibleRows.length}] ${row.externalRowId}: SUCCESS - draft reference ${rowResult.draftReference}`);
      } else {
        consecutiveFailures++;
        logger.error(`[${i + 1}/${eligibleRows.length}] ${row.externalRowId}: FAILED - ${rowResult.errorMessage}`);
      }

      const successCount = results.filter((r) => r.status === 'SUCCESS').length;
      const failedCount = results.filter((r) => r.status === 'FAILED').length;
      const skippedCount = results.filter((r) => r.status.startsWith('SKIPPED')).length;
      writeProgress({
        updatedAt: now,
        totalEligible: eligibleRows.length,
        processed: i + 1,
        successful: successCount,
        failed: failedCount,
        skipped: skippedCount,
        remaining: eligibleRows.length - (i + 1),
      });

      if (successCount > 0 && successCount % 10 === 0 && rowResult.status === 'SUCCESS') {
        logger.info(`--- PROGRESS: ${successCount} successful, ${failedCount} failed, ${skippedCount} skipped, ${eligibleRows.length - (i + 1)} remaining ---`);
      }

      if (consecutiveFailures >= CONSECUTIVE_FAILURE_STOP_THRESHOLD) {
        logger.error(`STOPPING: ${consecutiveFailures} consecutive row failures - this looks like a systemic issue, not isolated row problems. No further drafts will be attempted.`);
        stoppedForSystemicIssue = true;
        break;
      }
    }
  } finally {
    await browser.close();
  }

  await appendUploadResults(results);
  fs.writeFileSync(path.join(DATASET_DIR, 'upload-results-final.json'), JSON.stringify({ stoppedForSystemicIssue, results }, null, 2), 'utf-8');

  const successCount = results.filter((r) => r.status === 'SUCCESS').length;
  const failedCount = results.filter((r) => r.status === 'FAILED').length;
  const skippedCount = results.filter((r) => r.status.startsWith('SKIPPED')).length;
  logger.info('=== UPLOAD RUN COMPLETE ===');
  logger.info(`Attempted/processed: ${results.length}, Successful: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`);
  logger.info(`stoppedForSystemicIssue: ${stoppedForSystemicIssue}`);
  logger.info('Final Submit was never used - only "Save as Draft".');
}

main().catch((err) => {
  logger.error(`upload-basic-surgical-skill-dataset crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
