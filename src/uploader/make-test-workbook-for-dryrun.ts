/**
 * Builds a tiny, throwaway test workbook (in the OS temp scratchpad, not
 * generated-data) purely to prove the new dry-run gate in run-workbook.ts
 * works: zero login, zero browser, zero portal writes, before --execute.
 */
import ExcelJS from 'exceljs';

const HEADER = [
  'ExternalRowId',
  'Action',
  'CombinationKey',
  'Form',
  'CaseType',
  'SkillType',
  'Date of Assignment (YYYY-MM-DD)',
  'Name of the Patient',
  'Patient Reg No',
  'Date of Birth (YYYY-MM-DD)',
  'Age',
  'CompetencyItemsChecked (semicolon-separated)',
  'ExtraFieldsJSON',
];

async function main() {
  const wb = new ExcelJS.Workbook();
  const de = wb.addWorksheet('DataEntry');
  de.addRow(HEADER);
  // One deliberately invalid row (bad CaseType) to prove the dry-run
  // reports HOLD/ERROR without ever touching the portal.
  de.addRow([
    'TEST-001',
    'SAVE_DRAFT',
    'nonexistent-leaf-id',
    'Procedural and Interpretative Skills',
    'Nonexistent Specialty',
    'Procedural skill',
    '2026-03-01',
    'Test Patient',
    '0000/00',
    '1990-01-01',
    '36',
    'Nonexistent Skill',
    '{}',
  ]);
  const ur = wb.addWorksheet('UploadResult');
  ur.addRow(['ExternalRowId', 'Excel Row', 'Processing Status', 'Draft Reference', 'Attempt Time', 'Failed Field', 'Error Message', 'Screenshot Path']);

  const outPath = process.argv[2];
  await wb.xlsx.writeFile(outPath);
  console.log(`Test workbook written: ${outPath}`);
}

main();
