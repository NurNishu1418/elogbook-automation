/**
 * Additive update: adds ONE new sheet, "PDF-vs-Portal-Minimum-Count", to
 * the existing AutoScript-Input workbook, documenting every competency
 * where the authoritative BCPS PDF's stated minimum differs from the live
 * portal's own configured min_value quota. Does not touch any other
 * sheet. Pure local file work - zero portal contact.
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
const TARGET_DIR = path.join(PROJECT_ROOT, 'generated-data', 'AutoScript-Input');
const PDF_AUTHORITATIVE_PATH = process.argv[2]; // path to pdf-authoritative.json

function findLatestWorkbook(): string {
  const files = fs.readdirSync(TARGET_DIR).filter((f) => /^BCPS_AutoScript_Final_Input_Template(_v\d+)?\.xlsx$/.test(f));
  files.sort((a, b) => {
    const va = parseInt((a.match(/_v(\d+)\.xlsx$/) ?? [null, '1'])[1] as string, 10);
    const vb = parseInt((b.match(/_v(\d+)\.xlsx$/) ?? [null, '1'])[1] as string, 10);
    return vb - va;
  });
  return path.join(TARGET_DIR, files[0]);
}

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } };
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
}

async function main() {
  const targetPath = findLatestWorkbook();
  console.log(`Target workbook: ${targetPath}`);

  const formMap = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'form-map.json'), 'utf-8'));
  const pdf = JSON.parse(fs.readFileSync(PDF_AUTHORITATIVE_PATH, 'utf-8'));

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(targetPath);

  if (wb.worksheets.some((s) => s.name === 'PDF-vs-Portal-Minimum-Count')) {
    throw new Error('PDF-vs-Portal-Minimum-Count sheet already exists - refusing to duplicate.');
  }

  const sheet = wb.addWorksheet('PDF-vs-Portal-Minimum-Count');
  sheet.addRow(['Form', 'CaseType', 'SkillType', 'CompetencyItem', 'PDFMinimumRequired', 'PortalMinValue', 'Difference', 'Decision', 'Notes']);
  styleHeaderRow(sheet);

  let rowCount = 0;
  for (const [caseType, skillTypes] of Object.entries<any>(pdf)) {
    for (const [skillType, items] of Object.entries<any>(skillTypes)) {
      const leaf = formMap.leaves.find((l: any) => l.pathLabels[1] === caseType && l.pathLabels[2] === skillType);
      if (!leaf) continue;
      const form = leaf.pathLabels[0];
      for (const [itemName, val] of Object.entries<any>(items)) {
        const comp = leaf.competencyGroup.find((c: any) => c.particulars.trim() === itemName.trim());
        if (!comp) continue;
        const liveMinValues: string[] = (comp.log_entry_target ?? []).map((t: any) => t.min_value).filter(Boolean);
        const pdfMin = typeof val === 'number' ? val : val.min;
        const distinctLive = [...new Set(liveMinValues)];
        const portalMinDisplay = distinctLive.join(', ');
        const matchesPdf = distinctLive.length === 1 && distinctLive[0] === String(pdfMin);
        if (matchesPdf) continue; // only include actual discrepancies

        let notes = '';
        if (distinctLive.length > 1) {
          notes = `Portal quota varies by level (raw values: ${liveMinValues.join(', ')}) - shown here as the distinct set.`;
        }
        sheet.addRow([
          form,
          caseType,
          skillType,
          itemName,
          pdfMin,
          portalMinDisplay,
          `Portal ${distinctLive.length === 1 ? distinctLive[0] : '[' + distinctLive.join(',') + ']'} vs PDF ${pdfMin}`,
          'USE_PDF_MINIMUM',
          notes,
        ]);
        rowCount++;
      }
    }
  }

  sheet.columns = [
    { width: 32 }, { width: 42 }, { width: 26 }, { width: 60 }, { width: 20 }, { width: 20 }, { width: 26 }, { width: 20 }, { width: 55 },
  ];
  sheet.eachRow((row, n) => { if (n > 1) row.eachCell((cell) => (cell.alignment = { wrapText: true, vertical: 'top' })); });
  // Visually mark Decision as the resolved-policy column.
  sheet.getColumn(8).eachCell((cell, rowNum) => {
    if (rowNum === 1) return;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
  });

  await wb.xlsx.writeFile(targetPath);
  console.log(`PDF-vs-Portal-Minimum-Count sheet added. Discrepancy rows: ${rowCount}.`);
}

main().catch((err) => {
  console.error('add-pdf-vs-portal-minimum-sheet crashed:', err);
  process.exit(1);
});
