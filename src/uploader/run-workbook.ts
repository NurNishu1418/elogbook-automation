/**
 * Generic, parameterized live-upload runner for ANY compatible workbook
 * (not hardcoded to one dataset). This is NEW orchestration code written
 * for the app layer - it does not change the behaviour of any existing
 * "frozen" module. It calls the exact same proven building blocks that
 * src/uploader/upload-basic-surgical-skill-dataset.ts uses and established:
 * portal-side duplicate search before creating anything, post-save
 * field-level re-verification via the portal's own entry list (never a
 * guessed "success" banner), automatic session-recovery on expiry,
 * concurrency 1, and a 3-consecutive-failure circuit breaker. Save as Draft
 * only - there is no code path here that clicks Submit.
 *
 * Credentials are read the same way the rest of this project reads them:
 * via src/utils/env, which reads process.env / .env. The app server passes
 * runtime-provided credentials as env vars when it spawns this script, so
 * they never touch disk or argv.
 *
 * Configuration (all via environment variables, so nothing sensitive ever
 * appears in a process listing or on disk):
 *   UPLOAD_WORKBOOK_PATH     - absolute path to the .xlsx to process (required)
 *   UPLOAD_SELECTION_MODE    - "not-yet-uploaded" (default) | "all-valid" | "selected" | "range" | "failed-only"
 *   UPLOAD_SELECTED_ROW_IDS  - comma-separated ExternalRowIds, for mode=selected
 *   UPLOAD_RANGE_START       - Excel row number (inclusive), for mode=range
 *   UPLOAD_RANGE_END         - Excel row number (inclusive), for mode=range
 *
 * Companion files are written next to the workbook (same convention already
 * used for the Basic Surgical Skill dataset): "<name>.progress.json" and a
 * "<name>.stop.flag" file that, if present, causes the run to stop cleanly
 * before starting the next row (never mid-fill) so it can be resumed later.
 */
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
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
const CONSECUTIVE_FAILURE_STOP_THRESHOLD = 3;

const WORKBOOK_PATH = process.env.UPLOAD_WORKBOOK_PATH;
if (!WORKBOOK_PATH) {
  console.error('UPLOAD_WORKBOOK_PATH is required.');
  process.exit(1);
}
const SELECTION_MODE = process.env.UPLOAD_SELECTION_MODE ?? 'not-yet-uploaded';
const SELECTED_ROW_IDS = (process.env.UPLOAD_SELECTED_ROW_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const RANGE_START = process.env.UPLOAD_RANGE_START ? parseInt(process.env.UPLOAD_RANGE_START, 10) : null;
const RANGE_END = process.env.UPLOAD_RANGE_END ? parseInt(process.env.UPLOAD_RANGE_END, 10) : null;

const workbookDir = path.dirname(WORKBOOK_PATH);
const workbookBase = path.basename(WORKBOOK_PATH, '.xlsx');
const PROGRESS_PATH = path.join(workbookDir, `${workbookBase}.progress.json`);
const STOP_FLAG_PATH = path.join(workbookDir, `${workbookBase}.stop.flag`);
const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, 'screenshots', 'errors');

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
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

function stopRequested(): boolean {
  return fs.existsSync(STOP_FLAG_PATH);
}

async function appendUploadResults(rows: RowResult[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(WORKBOOK_PATH!);
  const ws = wb.getWorksheet('UploadResult');
  if (!ws) throw new Error('UploadResult sheet not found in workbook.');
  for (const r of rows) {
    ws.addRow([r.externalRowId, r.excelRow, r.status, r.draftReference, r.attemptTime, r.failedField, r.errorMessage, r.screenshotPath]);
  }
  await wb.xlsx.writeFile(WORKBOOK_PATH!);
}

function selectEligibleRows(
  validRows: { row: DataEntryRow; result: ReturnType<typeof validateRow> }[],
  alreadyDoneLocally: Map<string, string>,
  lastAttemptStatus: Map<string, string>
) {
  switch (SELECTION_MODE) {
    case 'all-valid':
      return validRows;
    case 'selected':
      return validRows.filter((v) => SELECTED_ROW_IDS.includes(v.row.externalRowId));
    case 'range':
      return validRows.filter((v) => (RANGE_START == null || v.row.excelRow >= RANGE_START) && (RANGE_END == null || v.row.excelRow <= RANGE_END));
    case 'failed-only':
      return validRows.filter((v) => lastAttemptStatus.get(v.row.externalRowId) === 'FAILED');
    case 'not-yet-uploaded':
    default:
      return validRows.filter((v) => !alreadyDoneLocally.has(v.row.externalRowId));
  }
}

async function main() {
  // Dry-run by default; only --execute may touch the portal at all. This
  // gate sits BEFORE any browser is launched or any login is attempted, so
  // a dry-run performs literally zero network/portal activity - not just
  // zero writes.
  const EXECUTE = process.argv.includes('--execute');
  logger.info(`=== Generic workbook upload runner: ${EXECUTE ? 'EXECUTE mode (Save as Draft only)' : 'DRY-RUN mode (zero portal writes, zero login)'} ===`);
  logger.info(`Workbook: ${WORKBOOK_PATH}`);
  logger.info(`Selection mode: ${SELECTION_MODE}`);

  if (fs.existsSync(STOP_FLAG_PATH)) fs.unlinkSync(STOP_FLAG_PATH);

  const formMap = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'form-map.json'), 'utf-8'));
  const leaves: LeafForValidation[] = formMap.leaves.map((l: any) => ({
    leafId: l.leafId,
    pathLabels: l.pathLabels,
    fields: l.fields ?? [],
    competencyGroup: l.competencyGroup ?? [],
  }));

  const allRows = await readDataEntryRows(WORKBOOK_PATH!);
  const draftRows = allRows.filter((r) => r.action === 'SAVE_DRAFT');
  const validationResults = draftRows.map((row) => ({ row, result: validateRow(row, leaves) }));
  const validRows = validationResults.filter((v) => v.result.valid);
  logger.info(`${draftRows.length} SAVE_DRAFT row(s) found, ${validRows.length} passed local validation.`);

  const alreadyDoneLocally = await readExistingUploadResults(WORKBOOK_PATH!);
  const lastAttemptStatus = await readLastAttemptStatus(WORKBOOK_PATH!);

  let eligibleRows = selectEligibleRows(validRows, alreadyDoneLocally, lastAttemptStatus).filter((v) => !alreadyDoneLocally.has(v.row.externalRowId));
  logger.info(`${eligibleRows.length} row(s) eligible to process under selection mode "${SELECTION_MODE}".`);

  // Always write a local preflight report - this is the READY/HOLD/ERROR
  // breakdown the dry-run is for, and it costs nothing to also write it
  // before an --execute run for the same audit trail.
  const dryRunReportPath = path.join(workbookDir, `${workbookBase}.dry-run-report.json`);
  const dryRunReport = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    workbookPath: WORKBOOK_PATH,
    selectionMode: SELECTION_MODE,
    totalRows: allRows.length,
    saveDraftRows: draftRows.length,
    validRows: validRows.length,
    invalidRows: draftRows.length - validRows.length,
    alreadyDoneCount: alreadyDoneLocally.size,
    eligibleForThisRun: eligibleRows.length,
    details: validationResults.map(({ row, result }) => ({
      excelRow: row.excelRow,
      externalRowId: row.externalRowId,
      status: !result.valid ? 'ERROR' : alreadyDoneLocally.has(row.externalRowId) ? 'ALREADY_DONE' : 'READY',
      errors: result.errors,
      resolvedCombination: result.resolvedLeaf ? result.resolvedLeaf.pathLabels.join(' > ') : null,
    })),
  };
  fs.writeFileSync(dryRunReportPath, JSON.stringify(dryRunReport, null, 2), 'utf-8');
  logger.info(`Wrote ${dryRunReportPath}`);
  const readyCount = dryRunReport.details.filter((d) => d.status === 'READY').length;
  const errorCount = dryRunReport.details.filter((d) => d.status === 'ERROR').length;
  const alreadyDoneReportCount = dryRunReport.details.filter((d) => d.status === 'ALREADY_DONE').length;
  logger.info(`READY=${readyCount}, HOLD/ERROR=${errorCount}, ALREADY_DONE=${alreadyDoneReportCount}`);

  if (!EXECUTE) {
    logger.info('Dry-run complete. No login was performed, no browser was launched - zero portal writes. Pass --execute to process eligible rows live (Save as Draft only, never Final Submit).');
    return;
  }

  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  const results: RowResult[] = [];
  let consecutiveFailures = 0;
  let stoppedForSystemicIssue = false;
  let stoppedByRequest = false;

  try {
    let loginResult;
    try {
      loginResult = await ensureLoggedIn(page);
    } catch (err) {
      if (err instanceof LoginBlockedError) {
        logger.error(`BLOCKED: ${err.message}`);
        writeProgress({ updatedAt: new Date().toISOString(), blocked: true, blockedReason: err.message, totalEligible: eligibleRows.length, processed: 0, successful: 0, failed: 0, skipped: 0, remaining: eligibleRows.length });
        process.exitCode = 2;
        return;
      }
      throw err;
    }
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      writeProgress({ updatedAt: new Date().toISOString(), loginFailed: true, reason: loginResult.reason, totalEligible: eligibleRows.length, processed: 0, successful: 0, failed: 0, skipped: 0, remaining: eligibleRows.length });
      process.exitCode = 2;
      return;
    }
    logger.info('Login confirmed.');

    logger.info('Fetching existing portal entries for duplicate pre-check (read-only)...');
    let portalEntries: PortalEntry[] = await fetchRecentEntries(page, 15, 20);
    logger.info(`Fetched ${portalEntries.length} existing entries from the portal for duplicate comparison.`);

    for (let i = 0; i < eligibleRows.length; i++) {
      if (stopRequested()) {
        logger.info('Stop requested - halting cleanly before the next row.');
        stoppedByRequest = true;
        break;
      }

      const { row, result } = eligibleRows[i];
      const leaf = result.resolvedLeaf!;
      const now = new Date().toISOString();

      const existing = findMatchingEntry(portalEntries, row, leaf);
      if (existing) {
        logger.info(`[${i + 1}/${eligibleRows.length}] ${row.externalRowId}: SKIPPED_DUPLICATE (already exists as portal entry ${existing.id})`);
        results.push({ externalRowId: row.externalRowId, excelRow: row.excelRow, status: 'SKIPPED_DUPLICATE', draftReference: existing.id, attemptTime: now, failedField: '', errorMessage: '', screenshotPath: '' });
        consecutiveFailures = 0;
        writeCurrentStatus(i, eligibleRows.length, row, leaf, results);
        continue;
      }

      logger.info(`[${i + 1}/${eligibleRows.length}] Processing ${row.externalRowId}: ${leaf.pathLabels.join(' > ')} | ${row.nameOfPatient} | RegNo=${row.patientRegNo}`);
      writeCurrentStatus(i, eligibleRows.length, row, leaf, results);

      let rowResult: RowResult;
      try {
        await page.goto(formUrl(), { waitUntil: 'domcontentloaded' });
        const sessionExpired = page.url().includes(env.loginPath) || (await page.$('input[name="password"]')) !== null;
        if (sessionExpired) {
          logger.info('  Session appears to have expired mid-run; re-logging in and retrying this row...');
          const relogin = await ensureLoggedIn(page);
          if (!relogin.success) throw new Error(`Re-login after session expiry failed: ${relogin.reason}`);
          await page.goto(formUrl(), { waitUntil: 'domcontentloaded' });
        }
        const fillResult = await fillAndSaveDraft(page, row, leaf);

        if (!fillResult.success && fillResult.failedField) {
          const screenshotPath = path.join(SCREENSHOTS_DIR, `${workbookBase}-${row.externalRowId}-${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
          rowResult = { externalRowId: row.externalRowId, excelRow: row.excelRow, status: 'FAILED', draftReference: '', attemptTime: now, failedField: fillResult.failedField, errorMessage: fillResult.error ?? 'Unknown error', screenshotPath };
        } else {
          let matched: PortalEntry | null = null;
          for (let attempt = 0; attempt < 4 && !matched; attempt++) {
            if (attempt > 0) await page.waitForTimeout(1500);
            const freshPage1 = await fetchRecentEntries(page, 1, 20);
            matched = findMatchingEntry(freshPage1, row, leaf);
          }
          if (!matched) {
            const screenshotPath = path.join(SCREENSHOTS_DIR, `${workbookBase}-${row.externalRowId}-${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
            rowResult = { externalRowId: row.externalRowId, excelRow: row.excelRow, status: 'FAILED', draftReference: '', attemptTime: now, failedField: '', errorMessage: `No matching entry found in the portal's own list after Save as Draft (fillAndSaveDraft reported success=${fillResult.success}).`, screenshotPath };
          } else {
            const comparison = compareEntryToRow(matched, row, leaf);
            portalEntries.unshift(matched);
            if (comparison.matches) {
              rowResult = { externalRowId: row.externalRowId, excelRow: row.excelRow, status: 'SUCCESS', draftReference: matched.id, attemptTime: now, failedField: '', errorMessage: '', screenshotPath: '' };
            } else {
              const screenshotPath = path.join(SCREENSHOTS_DIR, `${workbookBase}-${row.externalRowId}-${Date.now()}.png`);
              await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
              rowResult = { externalRowId: row.externalRowId, excelRow: row.excelRow, status: 'FAILED', draftReference: matched.id, attemptTime: now, failedField: '', errorMessage: `Post-save verification mismatch (draft ${matched.id} exists but does not match submitted data): ${comparison.mismatches.join(' | ')}`, screenshotPath };
            }
          }
        }
      } catch (err: any) {
        const screenshotPath = path.join(SCREENSHOTS_DIR, `${workbookBase}-${row.externalRowId}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
        rowResult = { externalRowId: row.externalRowId, excelRow: row.excelRow, status: 'FAILED', draftReference: '', attemptTime: now, failedField: '', errorMessage: `Exception: ${err?.message ?? err}`, screenshotPath };
      }

      results.push(rowResult);
      if (rowResult.status === 'SUCCESS') {
        consecutiveFailures = 0;
        logger.info(`[${i + 1}/${eligibleRows.length}] ${row.externalRowId}: SUCCESS - draft reference ${rowResult.draftReference}`);
      } else {
        consecutiveFailures++;
        logger.error(`[${i + 1}/${eligibleRows.length}] ${row.externalRowId}: FAILED - ${rowResult.errorMessage}`);
      }

      writeCurrentStatus(i + 1, eligibleRows.length, row, leaf, results);

      if (consecutiveFailures >= CONSECUTIVE_FAILURE_STOP_THRESHOLD) {
        logger.error(`STOPPING: ${consecutiveFailures} consecutive row failures - this looks like a systemic issue. No further drafts will be attempted.`);
        stoppedForSystemicIssue = true;
        break;
      }
    }
  } finally {
    await browser.close();
  }

  if (results.length > 0) await appendUploadResults(results);
  if (fs.existsSync(STOP_FLAG_PATH)) fs.unlinkSync(STOP_FLAG_PATH);

  const successCount = results.filter((r) => r.status === 'SUCCESS').length;
  const failedCount = results.filter((r) => r.status === 'FAILED').length;
  const skippedCount = results.filter((r) => r.status.startsWith('SKIPPED')).length;
  writeProgress({
    updatedAt: new Date().toISOString(),
    done: true,
    stoppedForSystemicIssue,
    stoppedByRequest,
    totalEligible: eligibleRows.length,
    processed: results.length,
    successful: successCount,
    failed: failedCount,
    skipped: skippedCount,
    remaining: eligibleRows.length - results.length,
  });

  logger.info('=== UPLOAD RUN COMPLETE ===');
  logger.info(`Processed: ${results.length}, Successful: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`);
  logger.info(`stoppedForSystemicIssue: ${stoppedForSystemicIssue}, stoppedByRequest: ${stoppedByRequest}`);
  logger.info('Final Submit was never used - only "Save as Draft".');

  function writeCurrentStatus(processedCount: number, total: number, currentRow: DataEntryRow, currentLeaf: LeafForValidation, resultsSoFar: RowResult[]) {
    const s = resultsSoFar.filter((r) => r.status === 'SUCCESS').length;
    const f = resultsSoFar.filter((r) => r.status === 'FAILED').length;
    const sk = resultsSoFar.filter((r) => r.status.startsWith('SKIPPED')).length;
    writeProgress({
      updatedAt: new Date().toISOString(),
      done: false,
      totalEligible: total,
      processed: processedCount,
      successful: s,
      failed: f,
      skipped: sk,
      remaining: total - processedCount,
      currentExternalRowId: currentRow.externalRowId,
      currentSkill: currentLeaf.pathLabels.join(' > '),
      currentStatus: 'processing',
    });
  }
}

async function readLastAttemptStatus(xlsxPath: string): Promise<Map<string, string>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.getWorksheet('UploadResult');
  const map = new Map<string, string>();
  if (!ws) return map;
  const headerRow = ws.getRow(1);
  const colIndex: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    colIndex[String(cell.value ?? '').trim()] = colNumber;
  });
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const id = String(row.getCell(colIndex['ExternalRowId']).value ?? '');
    const status = String(row.getCell(colIndex['Processing Status']).value ?? '');
    if (id) map.set(id, status); // later rows overwrite earlier ones, keeping the LAST attempt's status
  });
  return map;
}

main().catch((err) => {
  logger.error(`run-workbook crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
