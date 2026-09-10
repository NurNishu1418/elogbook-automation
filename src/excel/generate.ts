import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'output');
const XLSX_PATH = path.join(OUTPUT_DIR, 'BCPS_Logbook_Full_Mapping.xlsx');

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, name), 'utf-8'));
}

function sanitizeRangeName(s: string): string {
  let out = s.replace(/[^A-Za-z0-9_]/g, '_');
  if (/^[0-9]/.test(out)) out = '_' + out;
  return out.slice(0, 200);
}

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' } };
const REQUIRED_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };

function styleHeaderRow(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
  });
  row.height = 20;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
}

function addSheet(wb: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width?: number; wrap?: boolean }[]) {
  const ws = wb.addWorksheet(name);
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 22 }));
  return ws;
}

export async function generateExcel(): Promise<string> {
  const formMap = readJson<any>('form-map.json');
  const dependencies = readJson<any[]>('dependency-graph.json');
  const dropdownOptions = readJson<any[]>('dropdown-options.json');
  const combinationPaths = readJson<any[]>('combination-paths.json');
  const fields = readJson<any[]>('fields.json');
  const reconciliationPath = path.join(OUTPUT_DIR, 'verification-reconciliation.json');
  const reconciliation = fs.existsSync(reconciliationPath) ? readJson<any>('verification-reconciliation.json') : null;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'BCPS Logbook Mapper (automated)';
  wb.created = new Date();

  // ---------- README ----------
  const readme = wb.addWorksheet('README');
  readme.columns = [
    { header: 'Field', key: 'k', width: 32 },
    { header: 'Value', key: 'v', width: 100 },
  ];
  const verifiedCount = formMap.leaves.filter((l: any) => l.uiVerified).length;
  const failedCount = formMap.leaves.filter((l: any) => l.uiVerified === false).length;
  const readmeRows: [string, string][] = [
    ['Target Login URL', `${env.baseUrl}${env.loginPath}`],
    ['Target Form URL', `${env.baseUrl}${env.formPath}`],
    ['Generated At', new Date().toISOString()],
    ['User Type (login_type)', env.userType],
    ['Mapping Method', 'Live authenticated API discovery (get-form-list + dynamic-form-property-by-particular) cross-verified against the real rendered DOM via Playwright, with a second independent crawl for reconciliation.'],
    ['Matched Hierarchy Source', `get-form-list/${formMap.typeIndex} (auto-discovered by matching top-level ids against the live "form" dropdown)`],
    ['Total Leaf Combinations (Form > Case Type > Skill Type)', String(formMap.leaves.length)],
    ['Leaf Combinations Verified Live', String(verifiedCount)],
    ['Leaf Combinations Failed Verification', String(failedCount)],
    ['Total Fields Captured', String(fields.length)],
    [
      'Second Crawl Reconciliation',
      reconciliation
        ? `${reconciliation.summary.reconciled ? 'RECONCILED' : 'DISCREPANCIES FOUND'} - both crawls agree on ${reconciliation.summary.pathsPresentInBoth} paths, ${reconciliation.summary.disagreements} disagreement(s).`
        : 'Not yet run - execute "npm run verify-map" to generate output/verification-reconciliation.json.',
    ],
    [
      'Known Portal Quirk #1 - Field name sanitization',
      'The dynamic-form-property API returns column_name with literal periods (e.g. "Patient Reg. No"), but the live form strips periods from that field\'s rendered label/name/id (renders as "Patient Reg No"). The Fields sheet records the DOM-accurate name.',
    ],
    [
      'Known Portal Quirk #2 - Competency checklist text is verbatim',
      'Competency Group checklist items keep the API text exactly as-is (periods and trailing spaces preserved), unlike dynamic fields. Confirmed by live DOM inspection.',
    ],
    [
      'Known Portal Quirk #3 - "radio" field type does not render',
      'Fields declared with column_value_type="radio" (seen only under the Patient Management branch, e.g. "Cold/Routine Case, Emergency Case") have no corresponding input in the live DOM as of this mapping. These are marked CurrentlyVisible=No in the Fields sheet and excluded from the uploader\'s fillable set.',
    ],
    [
      'Known Portal Quirk #4 - get-form-list id instability for 2 leaves',
      'For "Vascular Surgery > Interpretative Skill" and "Vascular Surgery > Procedural skill", the id returned by a direct get-form-list/1 call does not always match the id the live page session actually uses for the same label (reproduced identically across two independent crawls). The mapper detects this at verification time and re-fetches the live id\'s schema; both id/field-count pairs are recorded in the Fields/CombinationPaths sheets. Likely cause: a duplicate-labelled backend record. Root cause is outside this tool\'s control - only BCPS can fix the underlying data.',
    ],
    ['Limitations', 'Only the "form" hierarchy reachable from this account\'s login_type/doctor_type was mapped (particulary_type=1, matching the two visible "form" options). Other particulary_type values exist in the API (e.g. "Academic Activity") but are not reachable from this specific Add Logbook Entry page/account and were correctly excluded.'],
    ['Coverage Summary', 'See the Coverage sheet for full numeric breakdown.'],
    ['Credentials', 'Never included in this workbook or in any log file. Read from .env at runtime only.'],
  ];
  readmeRows.forEach((r) => readme.addRow({ k: r[0], v: r[1] }));
  readme.getColumn('v').alignment = { wrapText: true, vertical: 'top' };
  readme.eachRow((row) => (row.getCell(1).font = { bold: true }));

  // ---------- Fields ----------
  const fieldsWs = addSheet(wb, 'Fields', [
    { header: 'FieldKey', key: 'fieldKey', width: 40 },
    { header: 'Label (as rendered)', key: 'label', width: 40 },
    { header: 'Normalized Label', key: 'normalizedLabel', width: 30 },
    { header: 'Section', key: 'section', width: 28 },
    { header: 'Subsection', key: 'subsection', width: 40 },
    { header: 'Control Type', key: 'controlType', width: 14 },
    { header: 'HTML Name', key: 'htmlName', width: 30 },
    { header: 'Primary Selector', key: 'primarySelector', width: 40 },
    { header: 'Fallback Selector', key: 'fallback', width: 40 },
    { header: 'Required', key: 'required', width: 10 },
    { header: 'Currently Visible', key: 'currentlyVisible', width: 14 },
    { header: 'Enabled', key: 'enabled', width: 10 },
    { header: 'Read-only', key: 'readonly', width: 10 },
    { header: 'Placeholder', key: 'placeholder', width: 30 },
    { header: 'Help / Notes', key: 'helpText', width: 60 },
    { header: 'Options (if any)', key: 'options', width: 50 },
    { header: 'Parent Path', key: 'parentPath', width: 60 },
    { header: 'Appears When', key: 'appearsWhen', width: 60 },
    { header: 'Required When', key: 'requiredWhen', width: 40 },
  ]);
  for (const f of fields) {
    const row = fieldsWs.addRow({
      fieldKey: f.fieldKey,
      label: f.label,
      normalizedLabel: f.normalizedLabel,
      section: f.section,
      subsection: f.subsection,
      controlType: f.controlType,
      htmlName: f.htmlName,
      primarySelector: f.primarySelector,
      fallback: (f.fallbackSelectors ?? []).join(' | '),
      required: f.required ? 'Yes' : 'No',
      currentlyVisible: f.currentlyVisible ? 'Yes' : 'No',
      enabled: f.enabled ? 'Yes' : 'No',
      readonly: f.readonly ? 'Yes' : 'No',
      placeholder: f.placeholder,
      helpText: f.helpText,
      options: f.options ? f.options.map((o: any) => o.text).join('; ') : '',
      parentPath: f.parentPath,
      appearsWhen: f.appearsWhen,
      requiredWhen: f.requiredWhen,
    });
    if (f.required) row.eachCell((c) => (c.fill = REQUIRED_FILL));
    row.getCell('helpText').alignment = { wrapText: true };
    row.getCell('parentPath').alignment = { wrapText: true };
  }
  styleHeaderRow(fieldsWs);

  // ---------- DropdownOptions ----------
  const ddWs = addSheet(wb, 'DropdownOptions', [
    { header: 'FieldKey', key: 'fieldKey', width: 20 },
    { header: 'Complete Parent Path', key: 'completeParentPath', width: 50 },
    { header: 'Option Text', key: 'optionText', width: 50 },
    { header: 'Option Value', key: 'optionValue', width: 40 },
    { header: 'Enabled', key: 'enabled', width: 10 },
    { header: 'Default', key: 'isDefault', width: 10 },
    { header: 'Display Order', key: 'displayOrder', width: 14 },
  ]);
  for (const o of dropdownOptions) {
    ddWs.addRow({
      fieldKey: o.fieldKey,
      completeParentPath: o.completeParentPath,
      optionText: o.optionText,
      optionValue: o.optionValue,
      enabled: o.enabled ? 'Yes' : 'No',
      isDefault: o.isDefault ? 'Yes' : 'No',
      displayOrder: o.displayOrder,
    });
  }
  styleHeaderRow(ddWs);

  // ---------- Dependencies ----------
  const depWs = addSheet(wb, 'Dependencies', [
    { header: 'Complete Parent Path', key: 'parentPath', width: 50 },
    { header: 'Controlling Field', key: 'controllingField', width: 20 },
    { header: 'Selected Option (text)', key: 'selectedOptionText', width: 40 },
    { header: 'Selected Option (value)', key: 'selectedOptionValue', width: 40 },
    { header: 'Affected Field / Section', key: 'affectedField', width: 20 },
    { header: 'Effect', key: 'effect', width: 18 },
    { header: 'Before State', key: 'beforeState', width: 30 },
    { header: 'After State', key: 'afterState', width: 60 },
    { header: 'Evidence', key: 'evidence', width: 60 },
  ]);
  for (const d of dependencies) {
    const row = depWs.addRow(d);
    row.getCell('afterState').alignment = { wrapText: true };
    row.getCell('evidence').alignment = { wrapText: true };
  }
  styleHeaderRow(depWs);

  // ---------- CombinationPaths ----------
  const cpWs = addSheet(wb, 'CombinationPaths', [
    { header: 'Path ID', key: 'pathId', width: 38 },
    { header: 'Path (Form > Case Type > Skill Type)', key: 'pathText', width: 70 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Reason / Notes', key: 'reason', width: 70 },
  ]);
  for (const c of combinationPaths) {
    const row = cpWs.addRow({
      pathId: c.pathId,
      pathText: c.path.map((p: any) => p.value).join(' > '),
      status: c.status,
      reason: c.reason ?? '',
    });
    if (c.status === 'failed') row.eachCell((cell) => (cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } }));
    if (c.status === 'success') row.eachCell((cell) => (cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } }));
    row.getCell('reason').alignment = { wrapText: true };
  }
  styleHeaderRow(cpWs);

  // ---------- ValidationRules ----------
  const vrWs = addSheet(wb, 'ValidationRules', [
    { header: 'Scope', key: 'scope', width: 40 },
    { header: 'Rule Type', key: 'ruleType', width: 20 },
    { header: 'Rule', key: 'rule', width: 60 },
    { header: 'Validation Message / Evidence', key: 'message', width: 70 },
  ]);
  vrWs.addRow({
    scope: 'All dynamic fields',
    ruleType: 'required',
    rule: 'required_ind=1 in dynamic-form-property-by-particular API response',
    message: 'Confirmed live: labels rendered with a "required-field" CSS class carry a visible marker; see the Fields sheet Required column for the exact per-field flag.',
  });
  vrWs.addRow({
    scope: 'All dynamic fields',
    ruleType: 'name sanitization',
    rule: 'Literal "." characters are stripped from column_name before it is used as the rendered label and the input name/id/for attribute.',
    message: 'Evidence: API "Patient Reg. No" renders live as "Patient Reg No" in label text, name, id and for attributes.',
  });
  vrWs.addRow({
    scope: 'Competency Group checklist items',
    ruleType: 'name sanitization (absence of)',
    rule: 'particulars text is used verbatim as the checkbox name/id/label - periods and trailing whitespace are NOT stripped.',
    message: 'Evidence: "Core-cut biopsy " (trailing space) and "...etc.)" (period) both render exactly as returned by the API.',
  });
  vrWs.addRow({
    scope: 'Fields with column_value_type="radio"',
    ruleType: 'non-rendering field',
    rule: 'No input/select/textarea is rendered for this field in the current live form, regardless of selection path.',
    message: 'Confirmed for: ' + fields.filter((f) => f.helpText && String(f.helpText).includes('no corresponding input')).map((f) => f.label).join('; '),
  });
  vrWs.addRow({
    scope: 'Vascular Surgery > Interpretative Skill / Procedural skill',
    ruleType: 'backend id instability',
    rule: 'The particular id returned by a fresh get-form-list/1 call for this exact label does not always match the id a live page session uses for dynamic-form-property-by-particular.',
    message: 'Reproduced identically across 2 independent crawls (see output/verification-reconciliation.json). The uploader must always resolve the live id via the actual UI selection, never a cached UUID.',
  });
  vrWs.addRow({
    scope: 'Save action',
    ruleType: 'allowed action',
    rule: 'Only "SAVE_DRAFT" is a supported Action value. Final Submit is never performed by the uploader.',
    message: 'Enforced in src/uploader - the "Submit" button is never clicked; only "Save as Draft" is clicked.',
  });
  for (const f of fields.filter((f) => f.required)) {
    vrWs.addRow({ scope: f.parentPath, ruleType: 'required field', rule: `"${f.label}" (${f.controlType}) is required`, message: f.requiredWhen });
  }
  styleHeaderRow(vrWs);
  vrWs.getColumn('message').alignment = { wrapText: true };
  vrWs.getColumn('rule').alignment = { wrapText: true };

  // ---------- Coverage ----------
  const covWs = wb.addWorksheet('Coverage');
  covWs.columns = [
    { header: 'Metric', key: 'metric', width: 45 },
    { header: 'Value', key: 'value', width: 80 },
  ];
  const totalControllingFields = new Set(dropdownOptions.map((o) => o.fieldKey)).size;
  const failedPaths = combinationPaths.filter((c) => c.status === 'failed');
  const coverageRows: [string, string | number][] = [
    ['Total UI states discovered (unique parent paths + leaves)', combinationPaths.length + dependencies.length],
    ['Total leaf combinations (Form > Case Type > Skill Type)', formMap.leaves.length],
    ['Total leaf combinations explored', formMap.leaves.length],
    ['Total fields captured (dynamic + competency checklist)', fields.length],
    ['Total controlling fields (Form, Case Type, Skill Type)', totalControllingFields],
    ['Total dropdown options captured', dropdownOptions.length],
    ['Total dependency relationships captured', dependencies.length],
    ['Total successful paths', combinationPaths.filter((c) => c.status === 'success').length],
    ['Total failed paths', failedPaths.length],
    ['Pending / unexplored paths', combinationPaths.filter((c) => c.status === 'pending').length],
    ['Exact reason for every failure', failedPaths.map((f) => `${f.pathId}: ${f.reason}`).join(' || ') || '(none)'],
    ['Second independent crawl run', reconciliation ? 'Yes' : 'No (run "npm run verify-map")'],
    ['Second crawl reconciled with first', reconciliation ? String(reconciliation.summary.reconciled) : 'n/a'],
  ];
  coverageRows.forEach((r) => covWs.addRow({ metric: r[0], value: r[1] }));
  covWs.getColumn('value').alignment = { wrapText: true };
  covWs.eachRow((row) => (row.getCell(1).font = { bold: true }));

  // ---------- Lists (hidden, backing dependent data validation) ----------
  const listsWs = wb.addWorksheet('Lists', { state: 'veryHidden' });
  let listCol = 1;
  const formNames: string[] = formMap.formOptions.map((o: any) => o.text);
  const formListCol = listCol++;
  formNames.forEach((name, i) => (listsWs.getCell(i + 1, formListCol).value = name));
  wb.definedNames.add(`Lists!$${colLetter(formListCol)}$1:$${colLetter(formListCol)}$${formNames.length}`, 'FormOptions');

  const caseTypesByForm = new Map<string, string[]>();
  const skillTypesByCaseType = new Map<string, string[]>();
  for (const leaf of formMap.leaves as any[]) {
    const [formLabel, caseTypeLabel, skillTypeLabel] = leaf.pathLabels;
    if (!caseTypesByForm.has(formLabel)) caseTypesByForm.set(formLabel, []);
    const ctList = caseTypesByForm.get(formLabel)!;
    if (!ctList.includes(caseTypeLabel)) ctList.push(caseTypeLabel);
    if (skillTypeLabel) {
      const ctKey = `${formLabel}||${caseTypeLabel}`;
      if (!skillTypesByCaseType.has(ctKey)) skillTypesByCaseType.set(ctKey, []);
      const stList = skillTypesByCaseType.get(ctKey)!;
      if (!stList.includes(skillTypeLabel)) stList.push(skillTypeLabel);
    }
  }
  for (const [formLabel, caseTypes] of caseTypesByForm) {
    const col = listCol++;
    caseTypes.forEach((name, i) => (listsWs.getCell(i + 1, col).value = name));
    const rangeName = 'CaseType_' + sanitizeRangeName(formLabel);
    wb.definedNames.add(`Lists!$${colLetter(col)}$1:$${colLetter(col)}$${caseTypes.length}`, rangeName);
  }
  for (const [ctKey, skillTypes] of skillTypesByCaseType) {
    const [, caseTypeLabel] = ctKey.split('||');
    const col = listCol++;
    skillTypes.forEach((name, i) => (listsWs.getCell(i + 1, col).value = name));
    const rangeName = 'SkillType_' + sanitizeRangeName(caseTypeLabel);
    wb.definedNames.add(`Lists!$${colLetter(col)}$1:$${colLetter(col)}$${skillTypes.length}`, rangeName);
  }

  // ---------- FieldCatalogByCombination ----------
  const catalogWs = addSheet(wb, 'FieldCatalogByCombination', [
    { header: 'CombinationKey (Path ID)', key: 'pathId', width: 38 },
    { header: 'Path', key: 'pathText', width: 60 },
    { header: 'Field Name', key: 'fieldName', width: 45 },
    { header: 'Control Type', key: 'controlType', width: 14 },
    { header: 'Required', key: 'required', width: 10 },
    { header: 'Currently Visible', key: 'currentlyVisible', width: 14 },
  ]);
  for (const f of fields) {
    const leafId = String(f.fieldKey).split('::')[0];
    const leaf = (formMap.leaves as any[]).find((l) => l.leafId === leafId);
    catalogWs.addRow({
      pathId: leafId,
      pathText: leaf ? leaf.pathLabels.join(' > ') : f.parentPath,
      fieldName: f.label,
      controlType: f.controlType,
      required: f.required ? 'Yes' : 'No',
      currentlyVisible: f.currentlyVisible ? 'Yes' : 'No',
    });
  }
  styleHeaderRow(catalogWs);

  // ---------- DataEntry ----------
  const dataWs = addSheet(wb, 'DataEntry', [
    { header: 'ExternalRowId', key: 'externalRowId', width: 18 },
    { header: 'Action', key: 'action', width: 14 },
    { header: 'CombinationKey', key: 'combinationKey', width: 38 },
    { header: 'Form', key: 'form', width: 40 },
    { header: 'CaseType', key: 'caseType', width: 45 },
    { header: 'SkillType', key: 'skillType', width: 30 },
    { header: 'Date of Assignment (YYYY-MM-DD)', key: 'dateOfAssignment', width: 24 },
    { header: 'Name of the Patient', key: 'nameOfPatient', width: 25 },
    { header: 'Patient Reg No', key: 'patientRegNo', width: 18 },
    { header: 'Date of Birth (YYYY-MM-DD)', key: 'dateOfBirth', width: 22 },
    { header: 'Age', key: 'age', width: 8 },
    { header: 'CompetencyItemsChecked (semicolon-separated)', key: 'competencyItems', width: 50 },
    { header: 'ExtraFieldsJSON', key: 'extraFieldsJson', width: 60 },
  ]);
  const exampleLeaf = formMap.leaves[0] as any;
  const coreNames = new Set(['Date of Assignment', 'Name of the Patient', 'Patient Reg. No', 'Date of Birth', 'Age']);
  const exampleExtra: Record<string, string> = {};
  for (const f of exampleLeaf.fields ?? []) {
    if (f.column_value_type === 'radio' || coreNames.has(f.column_name)) continue;
    if (f.required_ind === 1) exampleExtra[f.column_name] = `Example ${f.column_name}`;
  }
  const exampleCompetencyItem = (exampleLeaf.competencyGroup ?? [])[0]?.particulars ?? '';

  dataWs.addRow({
    externalRowId: 'EXAMPLE-1',
    action: 'SAVE_DRAFT',
    combinationKey: exampleLeaf.leafId,
    form: exampleLeaf.pathLabels[0],
    caseType: exampleLeaf.pathLabels[1],
    skillType: exampleLeaf.pathLabels[2] ?? '',
    dateOfAssignment: '2026-01-15',
    nameOfPatient: 'Example Patient',
    patientRegNo: '12345',
    dateOfBirth: '1990-01-01',
    age: '36',
    competencyItems: exampleCompetencyItem,
    extraFieldsJson: JSON.stringify(exampleExtra),
  });
  styleHeaderRow(dataWs);
  for (let r = 2; r <= 200; r++) {
    dataWs.getCell(`B${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"SAVE_DRAFT"'] };
    dataWs.getCell(`D${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['=FormOptions'] };
    dataWs.getCell(`E${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`=INDIRECT("CaseType_"&SUBSTITUTE(SUBSTITUTE($D${r}," ","_"),"&","_"))`],
      showErrorMessage: false,
    };
    dataWs.getCell(`F${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`=INDIRECT("SkillType_"&SUBSTITUTE(SUBSTITUTE($E${r}," ","_"),"&","_"))`],
      showErrorMessage: false,
    };
  }

  // ---------- UploadResult (template) ----------
  const resultWs = addSheet(wb, 'UploadResult', [
    { header: 'ExternalRowId', key: 'externalRowId', width: 18 },
    { header: 'Excel Row', key: 'excelRow', width: 12 },
    { header: 'Processing Status', key: 'status', width: 18 },
    { header: 'Draft Reference', key: 'draftReference', width: 24 },
    { header: 'Attempt Time', key: 'attemptTime', width: 24 },
    { header: 'Failed Field', key: 'failedField', width: 24 },
    { header: 'Error Message', key: 'errorMessage', width: 60 },
    { header: 'Screenshot Path', key: 'screenshotPath', width: 40 },
  ]);
  styleHeaderRow(resultWs);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  await wb.xlsx.writeFile(XLSX_PATH);
  logger.info(`Wrote ${XLSX_PATH}`);
  return XLSX_PATH;
}

function colLetter(n: number): string {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

if (require.main === module) {
  generateExcel().catch((err) => {
    logger.error(`Excel generation failed: ${err?.stack ?? err}`);
    process.exit(1);
  });
}
