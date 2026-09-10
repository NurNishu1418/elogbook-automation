/**
 * One-off, clearly-labeled synthetic test-data run for a single specific
 * combination (Basic Surgical Skill > Procedural skill > Intravenous
 * cannulation), requested explicitly by the user for staged validation of
 * the uploader before any real bulk use.
 *
 * This script does NOT modify src/mapper, src/excel, or any existing file
 * under src/uploader - it only imports and reuses their existing exported
 * functions (readDataEntryRows, validateRow, fillAndSaveDraft, login,
 * browser bootstrap) against a SEPARATE test workbook copy
 * (output/BCPS_Logbook_TEST_IVCannulation.xlsx), never the real
 * output/BCPS_Logbook_Full_Mapping.xlsx.
 *
 * Flow: generate 10 synthetic rows -> write them into the test workbook's
 * DataEntry sheet (values only, no structural/formula/validation changes)
 * -> dry-run validate all 10 via the existing validateRow logic -> if all
 * valid, execute ONLY row 1 for real (Save as Draft, never Submit) -> stop.
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { logger } from '../utils/logger';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn, LoginBlockedError } from '../auth/login';
import { formUrl } from '../utils/env';
import { readDataEntryRows, DataEntryRow } from './excelReader';
import { validateRow, LeafForValidation } from './validateRow';
import { fillAndSaveDraft } from './fillForm';

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'output');
const TEST_XLSX_PATH = path.join(OUTPUT_DIR, 'BCPS_Logbook_TEST_IVCannulation.xlsx');
const REAL_XLSX_PATH = path.join(OUTPUT_DIR, 'BCPS_Logbook_Full_Mapping.xlsx');

const FORM_LABEL = 'Procedural and Interpretative Skills';
const CASE_TYPE_LABEL = 'Basic Surgical Skill';
const SKILL_TYPE_LABEL = 'Procedural skill';
const COMPETENCY_ITEM = 'Intravenous cannulation';
// Per the discovered data (output/form-map.json), the only quota target
// defined for this exact competency item is compitency_level="4" - there is
// no separate "Level" input control anywhere in the live DOM (confirmed
// during mapping: checking a competency box never revealed an extra Level
// field). Checking this one item *is* the "Competence Level 4" entry; nothing
// else needs to be filled to represent it.
const EXPECTED_COMPETENCE_LEVEL_NOTE = 'Competence Level 4 (per discovered log_entry_target.compitency_level for this exact competency item - no separate UI field exists for it)';

interface SyntheticRow {
  externalRowId: string;
  dateOfAssignment: string;
  nameOfPatient: string;
  patientRegNo: string;
  dateOfBirth: string;
  age: string;
  briefProceduralNotes: string;
  diagnosisProblems: string;
  briefDescription: string;
}

function buildSyntheticRows(): SyntheticRow[] {
  const assignmentDates = ['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08'];
  const rows: SyntheticRow[] = [];
  for (let i = 1; i <= 10; i++) {
    const idx = i.toString().padStart(2, '0');
    const age = 21 + i; // 22..31, varied for realism
    const birthYear = 2026 - age;
    rows.push({
      externalRowId: `SYN-IVC-${i.toString().padStart(3, '0')}`,
      dateOfAssignment: assignmentDates[i - 1],
      nameOfPatient: `Synthetic Test Patient ${idx}`,
      patientRegNo: `TEST-IVC-${i.toString().padStart(4, '0')}`,
      dateOfBirth: `${birthYear}-01-15`,
      age: String(age),
      briefProceduralNotes: `Uncomplicated peripheral IV cannulation performed under direct supervision (synthetic case ${idx}).`,
      diagnosisProblems: 'Requires IV access for fluid/medication administration (synthetic test case).',
      briefDescription: 'Routine IV cannulation training case (synthetic test data).',
    });
  }
  return rows;
}

async function writeRowsIntoTestWorkbook(rows: SyntheticRow[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEST_XLSX_PATH);
  const ws = wb.getWorksheet('DataEntry');
  if (!ws) throw new Error('DataEntry sheet not found in test workbook.');

  // NOTE: after readFile(), ExcelJS does not restore worksheet.columns[].key
  // (that mapping only exists for sheets built in-memory via ws.columns =
  // [...]) - addRow(object) keyed by those names would therefore silently
  // write nothing. Build rows as plain arrays in the exact header order
  // instead, which works regardless of key metadata.
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell) => headers.push(String(cell.value ?? '').trim()));
  const idx = (name: string) => {
    const i = headers.indexOf(name);
    if (i === -1) throw new Error(`DataEntry header "${name}" not found. Headers: ${headers.join(', ')}`);
    return i;
  };
  const col = {
    externalRowId: idx('ExternalRowId'),
    action: idx('Action'),
    combinationKey: idx('CombinationKey'),
    form: idx('Form'),
    caseType: idx('CaseType'),
    skillType: idx('SkillType'),
    dateOfAssignment: idx('Date of Assignment (YYYY-MM-DD)'),
    nameOfPatient: idx('Name of the Patient'),
    patientRegNo: idx('Patient Reg No'),
    dateOfBirth: idx('Date of Birth (YYYY-MM-DD)'),
    age: idx('Age'),
    competencyItems: idx('CompetencyItemsChecked (semicolon-separated)'),
    extraFieldsJson: idx('ExtraFieldsJSON'),
  };

  // Remove existing data rows (below the header) without touching the
  // header, column widths, or the sheet's existing data-validation rules -
  // those were already copied verbatim from the real workbook.
  while (ws.rowCount > 1) {
    ws.spliceRows(2, 1);
  }

  for (const r of rows) {
    const extraFields = {
      'Brief Procedural Notes': r.briefProceduralNotes,
      'Diagnosis/Problems': r.diagnosisProblems,
      'Brief Description': r.briefDescription,
    };
    const values: any[] = new Array(headers.length).fill(null);
    values[col.externalRowId] = r.externalRowId;
    values[col.action] = 'SAVE_DRAFT';
    values[col.combinationKey] = ''; // filled in below once we know the leaf id
    values[col.form] = FORM_LABEL;
    values[col.caseType] = CASE_TYPE_LABEL;
    values[col.skillType] = SKILL_TYPE_LABEL;
    values[col.dateOfAssignment] = r.dateOfAssignment;
    values[col.nameOfPatient] = r.nameOfPatient;
    values[col.patientRegNo] = r.patientRegNo;
    values[col.dateOfBirth] = r.dateOfBirth;
    values[col.age] = r.age;
    values[col.competencyItems] = COMPETENCY_ITEM;
    values[col.extraFieldsJson] = JSON.stringify(extraFields);
    // ExcelJS array-form addRow is 1-indexed relative to column A internally
    // via the array's own 0-index -> column 1 mapping, matching header order.
    ws.addRow(values);
  }

  await wb.xlsx.writeFile(TEST_XLSX_PATH);
}

async function fillInCombinationKey(leafId: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEST_XLSX_PATH);
  const ws = wb.getWorksheet('DataEntry')!;
  const headerRow = ws.getRow(1);
  let combKeyCol = -1;
  headerRow.eachCell((cell, colNumber) => {
    if (String(cell.value ?? '').trim() === 'CombinationKey') combKeyCol = colNumber;
  });
  for (let r = 2; r <= ws.rowCount; r++) {
    ws.getRow(r).getCell(combKeyCol).value = leafId;
  }
  await wb.xlsx.writeFile(TEST_XLSX_PATH);
}

async function appendTestUploadResult(row: {
  externalRowId: string;
  excelRow: number;
  status: string;
  draftReference: string;
  attemptTime: string;
  failedField: string;
  errorMessage: string;
  screenshotPath: string;
}): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEST_XLSX_PATH);
  const ws = wb.getWorksheet('UploadResult');
  if (!ws) throw new Error('UploadResult sheet not found in test workbook.');
  ws.addRow({
    externalRowId: row.externalRowId,
    excelRow: row.excelRow,
    status: row.status,
    draftReference: row.draftReference,
    attemptTime: row.attemptTime,
    failedField: row.failedField,
    errorMessage: row.errorMessage,
    screenshotPath: row.screenshotPath,
  });
  await wb.xlsx.writeFile(TEST_XLSX_PATH);
}

async function main() {
  if (!fs.existsSync(TEST_XLSX_PATH)) {
    logger.error(`Test workbook not found at ${TEST_XLSX_PATH}. It must be a copy of the real workbook, created before running this script.`);
    process.exit(1);
  }
  if (path.resolve(TEST_XLSX_PATH) === path.resolve(REAL_XLSX_PATH)) {
    logger.error('Refusing to run: test workbook path resolves to the real mapping workbook.');
    process.exit(1);
  }

  const formMapPath = path.join(OUTPUT_DIR, 'form-map.json');
  const formMap = JSON.parse(fs.readFileSync(formMapPath, 'utf-8'));
  const leaves: LeafForValidation[] = formMap.leaves.map((l: any) => ({
    leafId: l.leafId,
    pathLabels: l.pathLabels,
    fields: l.fields ?? [],
    competencyGroup: l.competencyGroup ?? [],
  }));

  const targetLeaf = leaves.find((l) => l.pathLabels.join(' > ') === `${FORM_LABEL} > ${CASE_TYPE_LABEL} > ${SKILL_TYPE_LABEL}`);
  if (!targetLeaf) {
    logger.error(`Combination "${FORM_LABEL} > ${CASE_TYPE_LABEL} > ${SKILL_TYPE_LABEL}" not found in output/form-map.json.`);
    process.exit(1);
  }
  const hasCompetencyItem = targetLeaf.competencyGroup.some((c) => c.particulars.trim() === COMPETENCY_ITEM);
  if (!hasCompetencyItem) {
    logger.error(`Competency item "${COMPETENCY_ITEM}" not found under this combination in output/form-map.json.`);
    process.exit(1);
  }
  logger.info(`Resolved combination: ${targetLeaf.pathLabels.join(' > ')} (leafId=${targetLeaf.leafId})`);
  logger.info(`Competency item confirmed: "${COMPETENCY_ITEM}" - ${EXPECTED_COMPETENCE_LEVEL_NOTE}`);

  const rows = buildSyntheticRows();
  logger.info('Generated 10 synthetic rows:');
  rows.forEach((r) =>
    logger.info(
      `  ${r.externalRowId}: ${r.nameOfPatient} | RegNo=${r.patientRegNo} | DOB=${r.dateOfBirth} | Age=${r.age} | AssignDate=${r.dateOfAssignment}`
    )
  );

  await writeRowsIntoTestWorkbook(rows);
  await fillInCombinationKey(targetLeaf.leafId);
  logger.info(`Wrote 10 rows into ${TEST_XLSX_PATH} (DataEntry sheet only - no other sheet/structure touched).`);

  // ---- Step 1: dry-run validate all 10 rows (existing validateRow logic, unmodified) ----
  const readRows: DataEntryRow[] = await readDataEntryRows(TEST_XLSX_PATH);
  const draftRows = readRows.filter((r) => r.action === 'SAVE_DRAFT');
  const validationResults = draftRows.map((row) => ({ row, result: validateRow(row, leaves) }));
  const validCount = validationResults.filter((v) => v.result.valid).length;

  logger.info(`DRY RUN: ${draftRows.length} SAVE_DRAFT row(s) found, ${validCount} valid, ${draftRows.length - validCount} invalid.`);
  for (const { row, result } of validationResults) {
    if (!result.valid) {
      logger.error(`Row ${row.excelRow} (${row.externalRowId}) INVALID: ${result.errors.join(' | ')}`);
    }
  }

  const dryRunReport = {
    generatedAt: new Date().toISOString(),
    testWorkbook: TEST_XLSX_PATH,
    combination: targetLeaf.pathLabels.join(' > '),
    competencyItem: COMPETENCY_ITEM,
    totalRows: draftRows.length,
    validRows: validCount,
    invalidRows: draftRows.length - validCount,
    rows: validationResults.map(({ row, result }) => ({ externalRowId: row.externalRowId, valid: result.valid, errors: result.errors })),
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'upload-dry-run-report-TEST-IVCannulation.json'), JSON.stringify(dryRunReport, null, 2), 'utf-8');
  logger.info('Wrote output/upload-dry-run-report-TEST-IVCannulation.json');

  if (validCount !== draftRows.length) {
    logger.error('Not all rows are valid. Stopping before any execution, per the "10 valid rows only" requirement.');
    process.exit(1);
  }

  if (process.env.DRY_RUN_ONLY === 'true') {
    logger.info('DRY_RUN_ONLY=true set - stopping here before any browser/login/execution step, as requested for verification.');
    return;
  }

  // ---- Step 2: execute ONLY the first row for real (Save as Draft), then stop ----
  const firstRow = validationResults[0];
  logger.info(`Executing ONLY row 1 (${firstRow.row.externalRowId}) as a real Save-as-Draft. Rows 2-10 will NOT be processed in this run.`);

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
    logger.info('Login confirmed.');

    await page.goto(formUrl(), { waitUntil: 'domcontentloaded' });
    const fillResult = await fillAndSaveDraft(page, firstRow.row, firstRow.result.resolvedLeaf!);
    const now = new Date().toISOString();

    if (fillResult.success) {
      logger.info(`ROW 1 SUCCESS. Draft reference: ${fillResult.draftReference}`);
      await appendTestUploadResult({
        externalRowId: firstRow.row.externalRowId,
        excelRow: firstRow.row.excelRow,
        status: 'SUCCESS',
        draftReference: fillResult.draftReference ?? '',
        attemptTime: now,
        failedField: '',
        errorMessage: '',
        screenshotPath: '',
      });
    } else {
      const screenshotDir = path.resolve(__dirname, '..', '..', 'screenshots', 'errors');
      fs.mkdirSync(screenshotDir, { recursive: true });
      const screenshotPath = path.join(screenshotDir, `synthetic-ivc-row1-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
      logger.error(`ROW 1 FAILED: ${fillResult.error} (failedField=${fillResult.failedField ?? 'n/a'})`);
      await appendTestUploadResult({
        externalRowId: firstRow.row.externalRowId,
        excelRow: firstRow.row.excelRow,
        status: 'FAILED',
        draftReference: '',
        attemptTime: now,
        failedField: fillResult.failedField ?? '',
        errorMessage: fillResult.error ?? 'Unknown error',
        screenshotPath,
      });
    }

    const resultJson = {
      generatedAt: now,
      row: firstRow.row.externalRowId,
      combination: targetLeaf.pathLabels.join(' > '),
      success: fillResult.success,
      draftReference: fillResult.draftReference,
      error: fillResult.error,
      remainingRowsProcessed: 0,
      note: 'Execution stopped after row 1 per explicit instruction. Rows 2-10 remain unprocessed (still SAVE_DRAFT, no UploadResult entry).',
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'upload-results-TEST-IVCannulation.json'), JSON.stringify(resultJson, null, 2), 'utf-8');
    logger.info('Wrote output/upload-results-TEST-IVCannulation.json');
    logger.info('STOPPED after row 1, as instructed. Rows 2-10 were not opened or submitted in any form.');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`synthetic-iv-cannulation run crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
