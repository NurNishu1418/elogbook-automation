import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

const XLSX_PATH = path.resolve(__dirname, '..', '..', 'output', 'BCPS_Logbook_Full_Mapping.xlsx');

const REQUIRED_SHEETS = [
  'README',
  'Fields',
  'DropdownOptions',
  'Dependencies',
  'CombinationPaths',
  'ValidationRules',
  'Coverage',
  'FieldCatalogByCombination',
  'DataEntry',
  'UploadResult',
];

async function main() {
  if (!fs.existsSync(XLSX_PATH)) {
    logger.error(`File not found: ${XLSX_PATH}. Run "npm run map" first.`);
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  logger.info(`Opened ${XLSX_PATH} successfully.`);

  const errors: string[] = [];

  for (const name of REQUIRED_SHEETS) {
    const ws = wb.getWorksheet(name);
    if (!ws) {
      errors.push(`Missing required sheet: ${name}`);
      continue;
    }
    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell) => headers.push(String(cell.value ?? '').trim()));
    const dupes = headers.filter((h, i) => h && headers.indexOf(h) !== i);
    if (dupes.length > 0) errors.push(`Sheet "${name}" has duplicate column headers: ${[...new Set(dupes)].join(', ')}`);
    if (ws.rowCount < 1) errors.push(`Sheet "${name}" has no header row.`);
    logger.info(`Sheet "${name}": ${headers.length} columns, ${ws.rowCount - 1} data row(s).`);
  }

  const fieldsWs = wb.getWorksheet('Fields');
  if (fieldsWs && fieldsWs.rowCount < 2) errors.push('Fields sheet has no data rows.');

  const combWs = wb.getWorksheet('CombinationPaths');
  if (combWs) {
    let successCount = 0;
    let failedCount = 0;
    combWs.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const status = String(row.getCell(3).value ?? '');
      if (status === 'success') successCount++;
      if (status === 'failed') failedCount++;
    });
    logger.info(`CombinationPaths: ${successCount} success, ${failedCount} failed.`);
  }

  // JSON sidecar files must all parse cleanly too.
  const outDir = path.resolve(__dirname, '..', '..', 'output');
  const jsonFiles = ['form-map.json', 'dependency-graph.json', 'dropdown-options.json', 'combination-paths.json', 'fields.json', 'lookups.json', 'coverage-report.json'];
  for (const f of jsonFiles) {
    const p = path.join(outDir, f);
    if (!fs.existsSync(p)) {
      errors.push(`Missing JSON output file: ${f}`);
      continue;
    }
    try {
      JSON.parse(fs.readFileSync(p, 'utf-8'));
      logger.info(`${f}: parses OK.`);
    } catch (err: any) {
      errors.push(`${f} failed to parse: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    logger.error(`Validation FAILED with ${errors.length} issue(s):`);
    errors.forEach((e) => logger.error(`  - ${e}`));
    process.exit(1);
  }

  logger.info('Excel + JSON validation PASSED: file opens, all required sheets present, no duplicate columns, all JSON parses.');
}

main().catch((err) => {
  logger.error(`validate-excel crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
