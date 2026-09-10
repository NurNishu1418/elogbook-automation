/**
 * LOCAL ONLY. Updates exactly one row in BasicSurgical-LevelDecision:
 * ChosenLevel and DecisionStatus for entry 42397e0c-d7ae-4a9b-9e56-5dc31431da9b,
 * the only one of 112 unresolved entries whose narrative directly connects
 * a rubric-defined role ("under supervision" = Level 3, confirmed from the
 * live portal's own lookup data in checkpoints/discover.json) to the exact
 * checked competency item. No other cell, row, or sheet is touched.
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const TARGET_DIR = path.join(path.resolve(__dirname, '..', '..'), 'generated-data', 'AutoScript-Input');
const TARGET_ENTRY_ID = '42397e0c-d7ae-4a9b-9e56-5dc31431da9b';
const CHOSEN_LEVEL = '3';
const DECISION_STATUS = 'RESOLVED_FROM_AUTHORITATIVE_RUBRIC';

function findLatestWorkbook(): string {
  const files = fs.readdirSync(TARGET_DIR).filter((f) => /^BCPS_AutoScript_Final_Input_Template(_v\d+)?\.xlsx$/.test(f));
  files.sort((a, b) => {
    const va = parseInt((a.match(/_v(\d+)\.xlsx$/) ?? [null, '1'])[1] as string, 10);
    const vb = parseInt((b.match(/_v(\d+)\.xlsx$/) ?? [null, '1'])[1] as string, 10);
    return vb - va;
  });
  return path.join(TARGET_DIR, files[0]);
}

async function main() {
  const targetPath = findLatestWorkbook();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(targetPath);
  const sheet = wb.getWorksheet('BasicSurgical-LevelDecision');
  if (!sheet) throw new Error('BasicSurgical-LevelDecision sheet not found.');

  let found = false;
  for (let r = 2; r <= sheet.rowCount; r++) {
    const id = sheet.getCell(`A${r}`).value;
    if (id === TARGET_ENTRY_ID) {
      const allowed = String(sheet.getCell(`G${r}`).value ?? '');
      if (!allowed.split(',').includes(CHOSEN_LEVEL)) {
        throw new Error(`Refusing to set ChosenLevel=${CHOSEN_LEVEL}: not in MappedAllowedLevels "${allowed}" for row ${r}.`);
      }
      const currentChosen = sheet.getCell(`H${r}`).value;
      if (currentChosen) {
        throw new Error(`Row ${r} already has a ChosenLevel ("${currentChosen}") - refusing to overwrite.`);
      }
      sheet.getCell(`H${r}`).value = CHOSEN_LEVEL;
      sheet.getCell(`I${r}`).value = DECISION_STATUS;
      found = true;
      console.log(`Row ${r} (${id}) updated: ChosenLevel=${CHOSEN_LEVEL}, DecisionStatus=${DECISION_STATUS}`);
      break;
    }
  }
  if (!found) throw new Error(`Entry ${TARGET_ENTRY_ID} not found in BasicSurgical-LevelDecision.`);

  await wb.xlsx.writeFile(targetPath);
  console.log(`Workbook saved: ${targetPath}`);
}

main().catch((err) => {
  console.error('resolve-one-basic-surgical-level crashed:', err);
  process.exit(1);
});
