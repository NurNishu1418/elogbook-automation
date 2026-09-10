import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { logger } from '../utils/logger';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn, LoginBlockedError } from '../auth/login';
import { formUrl } from '../utils/env';
import { readDataEntryRows, readExistingUploadResults, DataEntryRow } from './excelReader';
import { validateRow, LeafForValidation } from './validateRow';
import { fillAndSaveDraft } from './fillForm';

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'output');
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', '..', 'screenshots', 'errors');
const XLSX_PATH = path.join(OUTPUT_DIR, 'BCPS_Logbook_Full_Mapping.xlsx');

interface UploadResultRow {
  externalRowId: string;
  excelRow: number;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED_INVALID' | 'SKIPPED_ALREADY_DONE';
  draftReference: string;
  attemptTime: string;
  failedField: string;
  errorMessage: string;
  screenshotPath: string;
}

async function appendUploadResults(rows: UploadResultRow[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  const ws = wb.getWorksheet('UploadResult');
  if (!ws) throw new Error('UploadResult sheet not found.');
  for (const r of rows) {
    ws.addRow({
      externalRowId: r.externalRowId,
      excelRow: r.excelRow,
      status: r.status,
      draftReference: r.draftReference,
      attemptTime: r.attemptTime,
      failedField: r.failedField,
      errorMessage: r.errorMessage,
      screenshotPath: r.screenshotPath,
    });
  }
  await wb.xlsx.writeFile(XLSX_PATH);
}

async function main() {
  const execute = process.argv.includes('--execute');
  logger.info(`Uploader starting in ${execute ? 'EXECUTE' : 'DRY-RUN'} mode.`);

  if (!fs.existsSync(XLSX_PATH)) {
    logger.error(`Workbook not found: ${XLSX_PATH}. Run "npm run map" first.`);
    process.exit(1);
  }
  const formMapPath = path.join(OUTPUT_DIR, 'form-map.json');
  if (!fs.existsSync(formMapPath)) {
    logger.error(`${formMapPath} not found. Run "npm run map" first.`);
    process.exit(1);
  }
  const formMap = JSON.parse(fs.readFileSync(formMapPath, 'utf-8'));
  const leaves: LeafForValidation[] = formMap.leaves.map((l: any) => ({
    leafId: l.leafId,
    pathLabels: l.pathLabels,
    fields: l.fields ?? [],
    competencyGroup: l.competencyGroup ?? [],
  }));

  const rows = await readDataEntryRows(XLSX_PATH);
  logger.info(`Read ${rows.length} data row(s) from DataEntry sheet.`);

  const draftRows = rows.filter((r) => r.action === 'SAVE_DRAFT');
  logger.info(`${draftRows.length} row(s) have Action=SAVE_DRAFT; other rows are ignored.`);

  const validationResults = draftRows.map((row) => ({ row, result: validateRow(row, leaves) }));
  const validCount = validationResults.filter((v) => v.result.valid).length;
  const invalidCount = validationResults.length - validCount;

  logger.info(`Local validation: ${validCount} valid, ${invalidCount} invalid.`);
  for (const { row, result } of validationResults) {
    if (!result.valid) {
      logger.error(`Row ${row.excelRow} (${row.externalRowId}) INVALID:`);
      result.errors.forEach((e) => logger.error(`  - ${e}`));
    }
  }

  const dryRunReport = {
    generatedAt: new Date().toISOString(),
    mode: execute ? 'execute' : 'dry-run',
    totalRows: rows.length,
    saveDraftRows: draftRows.length,
    validRows: validCount,
    invalidRows: invalidCount,
    details: validationResults.map(({ row, result }) => ({
      excelRow: row.excelRow,
      externalRowId: row.externalRowId,
      valid: result.valid,
      errors: result.errors,
      resolvedCombination: result.resolvedLeaf ? result.resolvedLeaf.pathLabels.join(' > ') : null,
    })),
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'upload-dry-run-report.json'), JSON.stringify(dryRunReport, null, 2), 'utf-8');
  logger.info('Wrote output/upload-dry-run-report.json');

  if (!execute) {
    logger.info('Dry-run complete. No login was performed and no drafts were created. Pass --execute to create real drafts.');
    return;
  }

  const alreadyDone = await readExistingUploadResults(XLSX_PATH);
  logger.info(`${alreadyDone.size} row(s) already have a verified successful draft and will be skipped.`);

  const resultsToAppend: UploadResultRow[] = [];
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

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
    logger.info('Login confirmed. Processing rows sequentially (concurrency=1)...');

    for (const { row, result } of validationResults) {
      const now = new Date().toISOString();
      if (!result.valid) {
        resultsToAppend.push({
          externalRowId: row.externalRowId,
          excelRow: row.excelRow,
          status: 'SKIPPED_INVALID',
          draftReference: '',
          attemptTime: now,
          failedField: '',
          errorMessage: result.errors.join(' | '),
          screenshotPath: '',
        });
        continue;
      }
      if (alreadyDone.has(row.externalRowId)) {
        resultsToAppend.push({
          externalRowId: row.externalRowId,
          excelRow: row.excelRow,
          status: 'SKIPPED_ALREADY_DONE',
          draftReference: alreadyDone.get(row.externalRowId)!,
          attemptTime: now,
          failedField: '',
          errorMessage: '',
          screenshotPath: '',
        });
        continue;
      }

      logger.info(`Processing row ${row.excelRow} (${row.externalRowId}): ${result.resolvedLeaf!.pathLabels.join(' > ')}`);
      await page.goto(formUrl(), { waitUntil: 'domcontentloaded' });

      try {
        const fillResult = await fillAndSaveDraft(page, row, result.resolvedLeaf!);
        if (fillResult.success) {
          logger.info(`Row ${row.excelRow}: SUCCESS, draft reference = ${fillResult.draftReference}`);
          resultsToAppend.push({
            externalRowId: row.externalRowId,
            excelRow: row.excelRow,
            status: 'SUCCESS',
            draftReference: fillResult.draftReference ?? '',
            attemptTime: now,
            failedField: '',
            errorMessage: '',
            screenshotPath: '',
          });
        } else {
          const screenshotPath = path.join(SCREENSHOTS_DIR, `row-${row.excelRow}-${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
          logger.error(`Row ${row.excelRow}: FAILED - ${fillResult.error}`);
          resultsToAppend.push({
            externalRowId: row.externalRowId,
            excelRow: row.excelRow,
            status: 'FAILED',
            draftReference: '',
            attemptTime: now,
            failedField: fillResult.failedField ?? '',
            errorMessage: fillResult.error ?? 'Unknown error',
            screenshotPath,
          });
        }
      } catch (err: any) {
        const screenshotPath = path.join(SCREENSHOTS_DIR, `row-${row.excelRow}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
        logger.error(`Row ${row.excelRow}: EXCEPTION - ${err?.message ?? err}`);
        resultsToAppend.push({
          externalRowId: row.externalRowId,
          excelRow: row.excelRow,
          status: 'FAILED',
          draftReference: '',
          attemptTime: now,
          failedField: '',
          errorMessage: err?.message ?? String(err),
          screenshotPath,
        });
      }
    }
  } finally {
    await browser.close();
  }

  await appendUploadResults(resultsToAppend);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'upload-results.json'), JSON.stringify(resultsToAppend, null, 2), 'utf-8');
  const successCount = resultsToAppend.filter((r) => r.status === 'SUCCESS').length;
  const failedCount = resultsToAppend.filter((r) => r.status === 'FAILED').length;
  logger.info(`Upload run complete: ${successCount} succeeded, ${failedCount} failed, ${resultsToAppend.length - successCount - failedCount} skipped.`);
}

main().catch((err) => {
  logger.error(`Uploader crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
