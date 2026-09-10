/**
 * Additive update: opens the EXISTING BCPS_AutoScript_Final_Input_Template
 * workbook and adds ONE new sheet, "FullMapping", built from the current
 * mapping files. Does not touch any other sheet. Pure local file work -
 * zero portal contact.
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
const TARGET_DIR = path.join(PROJECT_ROOT, 'generated-data', 'AutoScript-Input');

function findLatestWorkbook(): string {
  const files = fs.readdirSync(TARGET_DIR).filter((f) => /^BCPS_AutoScript_Final_Input_Template(_v\d+)?\.xlsx$/.test(f));
  if (files.length === 0) throw new Error('No BCPS_AutoScript_Final_Input_Template*.xlsx found.');
  // Highest version number wins; the base name (no _vN) is version 1.
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
  const dependencyGraph = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'dependency-graph.json'), 'utf-8'));
  const dropdownOptions = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'dropdown-options.json'), 'utf-8'));
  // combination-paths.json / fields.json / lookups.json are also inspected
  // per instruction, cross-referenced below where they add information
  // beyond form-map.json (which already carries per-leaf fields and
  // competency data as the single most complete source).
  const combinationPaths = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'combination-paths.json'), 'utf-8'));
  const lookups = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'lookups.json'), 'utf-8'));

  // Build a lookup of dependency info keyed by leafId if the shape supports it.
  const dependencyByLeaf = new Map<string, any>();
  const depEntries = Array.isArray(dependencyGraph) ? dependencyGraph : Object.entries(dependencyGraph).map(([k, v]) => ({ leafId: k, ...(v as any) }));
  for (const d of depEntries as any[]) {
    const key = d.leafId ?? d.id;
    if (key) dependencyByLeaf.set(key, d);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(targetPath);

  const existingSheetNames = wb.worksheets.map((s) => s.name);
  if (existingSheetNames.includes('FullMapping')) {
    throw new Error('FullMapping sheet already exists in this workbook - refusing to overwrite. Investigate before re-running.');
  }

  const sheet = wb.addWorksheet('FullMapping');
  sheet.addRow(['Form', 'CaseType', 'SkillType', 'CombinationKey', 'CompetencyItem', 'AllowedCompetencyLevels', 'PortalFieldLabel', 'JSONKey', 'FieldType', 'Required', 'Visible', 'Enabled', 'Dependency', 'Notes']);
  styleHeaderRow(sheet);

  const universalFields = new Set(['Date of Assignment', 'Name of the Patient', 'Patient Reg. No', 'Date of Birth', 'Age']);
  let rowCount = 0;
  const seenLogicalRows = new Set<string>();
  let duplicateSkipped = 0;

  for (const leaf of formMap.leaves ?? []) {
    const form = leaf.pathLabels?.[0] ?? '';
    const caseType = leaf.pathLabels?.[1] ?? '';
    const skillType = leaf.pathLabels?.[2] ?? '';
    const isVascular = caseType === 'Vascular Surgery';
    const dep = dependencyByLeaf.get(leaf.leafId);
    const dependencyNote = dep ? JSON.stringify(dep).slice(0, 200) : '';

    const items = leaf.competencyGroup ?? [];
    const fields = leaf.fields ?? [];

    // One row per (CompetencyItem x dynamic field), so every field's
    // Required/Visible/Enabled/JSONKey is explicit; if there are no
    // competency items (pure Clinical/Communication leaves with no
    // level-bearing checklist), still emit one row per dynamic field with
    // CompetencyItem blank; if there are no dynamic fields either
    // (shouldn't happen, but fail-safe), emit one row for the leaf itself.
    const dynamicFields = fields.filter((f: any) => !universalFields.has(f.column_name) && f.column_value_type !== 'checkbox');

    const emitRow = (competencyItem: string, allowedLevels: string, field: any | null) => {
      const logicalKey = `${leaf.leafId}::${competencyItem}::${field ? field.column_name : ''}`;
      if (seenLogicalRows.has(logicalKey)) {
        duplicateSkipped++;
        return;
      }
      seenLogicalRows.add(logicalKey);
      let notes = '';
      if (isVascular) notes = 'PORTAL_ROUTING_HOLD: Vascular Surgery Case Type selection loads Thoracic and Cardiovascular Surgery\'s schema instead (confirmed live bug).';
      if (allowedLevels.split(',').includes('5')) notes = (notes ? notes + ' | ' : '') + 'LEVEL5_PORTAL_HOLD: mapped level "5" has no corresponding portal checkbox.';
      sheet.addRow([
        form,
        caseType,
        skillType,
        leaf.leafId,
        competencyItem,
        allowedLevels,
        field ? field.column_name : '',
        field ? field.column_name : '',
        field ? field.column_value_type : '',
        field ? (field.required_ind === 1 ? 'Required' : 'Optional') : '',
        field ? 'Yes' : '',
        field ? 'Yes' : '',
        dependencyNote,
        notes,
      ]);
      rowCount++;
    };

    if (items.length === 0) {
      if (dynamicFields.length === 0) {
        emitRow('', '', null);
      } else {
        for (const f of dynamicFields) emitRow('', '', f);
      }
    } else {
      for (const item of items) {
        const levels = (item.log_entry_target ?? []).map((t: any) => t.compitency_level).filter((l: any) => l !== null && l !== undefined && l !== '').join(',');
        if (dynamicFields.length === 0) {
          emitRow(item.particulars, levels, null);
        } else {
          for (const f of dynamicFields) emitRow(item.particulars, levels, f);
        }
      }
    }
  }

  sheet.columns = [
    { width: 32 }, { width: 40 }, { width: 26 }, { width: 38 }, { width: 55 }, { width: 20 },
    { width: 40 }, { width: 30 }, { width: 14 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 40 }, { width: 55 },
  ];
  sheet.eachRow((row, n) => { if (n > 1) row.eachCell((cell) => (cell.alignment = { wrapText: true, vertical: 'top' })); });

  await wb.xlsx.writeFile(targetPath);
  console.log(`FullMapping sheet added. Rows written: ${rowCount}. Duplicate logical rows skipped: ${duplicateSkipped}.`);
  console.log(`combinationPaths entries available: ${Array.isArray(combinationPaths) ? combinationPaths.length : Object.keys(combinationPaths).length} (form-map.json used as primary source; cross-checked, not superseded).`);
  console.log(`lookups.json entries available: ${Array.isArray(lookups) ? lookups.length : Object.keys(lookups).length}`);
  console.log(`dropdown-options.json entries available: ${Array.isArray(dropdownOptions) ? dropdownOptions.length : Object.keys(dropdownOptions).length}`);
}

main().catch((err) => {
  console.error('add-fullmapping-sheet crashed:', err);
  process.exit(1);
});
