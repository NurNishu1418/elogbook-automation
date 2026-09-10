/**
 * AGENT 2 - Phase 1 & 2: builds the blank Master auto-data template and
 * 18 specialty-wise blank workbooks, all sharing the exact 13-column
 * DataEntry schema. Pure local file generation - ZERO portal contact of
 * any kind (no browser launched, no login, no network request).
 *
 * No genuine case data has been supplied for this run, so every DataEntry
 * sheet created here is intentionally empty (header row only) - per the
 * explicit "do not fabricate clinical data" rule, this script never
 * invents rows.
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_ROOT = path.join(PROJECT_ROOT, 'generated-data', '2026-09-10');

const DATA_ENTRY_COLUMNS = [
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
  'CompetencyItemsChecked',
  'ExtraFieldsJSON',
];

const SPECIALTIES = [
  'Abdominal Wall',
  'Accident & Emergency / Casualty',
  'Anaesthesia & Procedural critical care',
  'Basic Surgical Skill',
  'Disorders of the Breast',
  'Gastrointestinal & HepatoBiliary System and Pancreas',
  'Minimally Invasive Surgery – Laparoscopic procedures',
  'Neurosurgery',
  'Orthopaedic Surgery',
  'Paediatric Surgery',
  'Parasites of Surgical Importance',
  'Plastic Surgery',
  'Procedural Nutrition',
  'Skin and Subcutaneous Tissue',
  'Surgical Oncology',
  'Thoracic and Cardiovascular Surgery',
  'Urology',
  'Vascular Surgery',
];

function slugify(name: string): string {
  return name
    .replace(/&/g, 'and')
    .replace(/[\/–,]/g, '-')
    .replace(/[^A-Za-z0-9\- ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function addDataEntrySheet(wb: ExcelJS.Workbook) {
  const sheet = wb.addWorksheet('DataEntry');
  sheet.addRow(DATA_ENTRY_COLUMNS);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    col.width = 28;
  });
  return sheet;
}

function addHoldForReviewSheet(wb: ExcelJS.Workbook) {
  const sheet = wb.addWorksheet('HoldForReview');
  sheet.addRow(['ExternalRowId', 'CombinationKey', 'HoldReason', 'FieldsInQuestion', 'Notes']);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    col.width = 30;
  });
  return sheet;
}

function addValidationSummarySheet(wb: ExcelJS.Workbook, specialty?: string) {
  const sheet = wb.addWorksheet('ValidationSummary');
  sheet.addRow(['Metric', 'Value']);
  sheet.getRow(1).font = { bold: true };
  const rows: [string, string | number][] = [
    ['Specialty', specialty ?? 'ALL (Master)'],
    ['Genuine case rows received', 0],
    ['Rows transformed', 0],
    ['Upload-ready rows', 0],
    ['Held rows', 0],
    ['Generated at', new Date().toISOString()],
    ['Note', 'No genuine source case data has been supplied yet - this workbook is a blank, uploader-compatible template only.'],
  ];
  rows.forEach((r) => sheet.addRow(r));
  sheet.columns.forEach((col) => {
    col.width = 40;
  });
  return sheet;
}

function addInputGuideSheet(wb: ExcelJS.Workbook) {
  const sheet = wb.addWorksheet('InputGuide');
  sheet.addRow(['Column', 'Description']);
  sheet.getRow(1).font = { bold: true };
  const guide: [string, string][] = [
    ['ExternalRowId', 'A unique identifier for this row within this workbook. Must never repeat within the same file.'],
    ['Action', 'Always SAVE_DRAFT for this pipeline. The uploader never issues Final Submit.'],
    ['CombinationKey', 'The exact Form>CaseType>SkillType path key this row targets, resolved from output/form-map.json - never invented.'],
    ['Form', 'Exact portal Form label (e.g. "Procedural and Interpretative Skills" or "Patient Management").'],
    ['CaseType', 'Exact portal Case Type label for this specialty, spelled exactly as the live mapping records it.'],
    ['SkillType', 'Exact portal Skill Type label (e.g. "Procedural skill", "Interpretative Skill", "Communication and Writing Skill", "Clinical skill").'],
    ['Date of Assignment (YYYY-MM-DD)', 'Genuine supplied date only. Never invented.'],
    ['Name of the Patient', 'Genuine supplied patient name only. Never copied from an unrelated case.'],
    ['Patient Reg No', 'Genuine supplied registration number, format ####/## where applicable. Duplicates are detected, never silently replaced.'],
    ['Date of Birth (YYYY-MM-DD)', 'Genuine supplied DOB. Must be before the Date of Assignment.'],
    ['Age', 'Completed age on the Date of Assignment - must match the DOB-derived calculation exactly.'],
    ['CompetencyItemsChecked', 'The exact mapped competency label for the checked skill/item - spelling, punctuation and spacing must match the live portal mapping exactly.'],
    ['ExtraFieldsJSON', 'JSON object of only the fields mapped for this exact leaf, plus the reserved "CompetencyLevel" key where a Procedural skill requires it. No unknown keys are permitted.'],
  ];
  guide.forEach((r) => sheet.addRow(r));
  sheet.columns = [{ width: 32 }, { width: 90 }];
  return sheet;
}

function addValidationRulesSheet(wb: ExcelJS.Workbook) {
  const sheet = wb.addWorksheet('ValidationRules');
  sheet.addRow(['Rule']);
  sheet.getRow(1).font = { bold: true };
  const rules = [
    'Exactly 13 columns in DataEntry, in the fixed order shown in InputGuide - never add or remove columns.',
    'Every row must resolve to a real leaf in output/form-map.json via its CombinationKey - no invented combinations.',
    'CompetencyItemsChecked must exactly match a mapped competency label for that exact leaf (no normalization).',
    'Procedural rows must carry exactly one CompetencyLevel inside ExtraFieldsJSON, drawn only from that skill\'s allowed level set.',
    'A skill with only one allowed level resolves deterministically to that level.',
    'A skill with multiple allowed levels is only assigned a level when authoritative evidence supports a specific choice with HIGH confidence; otherwise the row is held as HUMAN_LEVEL_DECISION_REQUIRED.',
    'A skill whose only mapped level has no corresponding portal checkbox (e.g. Level 5) is held as LEVEL5_PORTAL_HOLD - never substituted with an available level.',
    'Vascular Surgery rows are held as PORTAL_ROUTING_HOLD until the confirmed Vascular-to-Thoracic Case Type routing bug is proven fixed.',
    'Diagnosis/Problems (or the Interpretative equivalent) must state the real clinical reason for the procedure/investigation - never merely repeat the skill name.',
    'Brief Procedural Notes / Interpretations must describe what was genuinely done/found, consistent with the stated Diagnosis/Indication.',
    'Brief Description must summarize the same single clinical event as the other fields - never a different case.',
    'Age must equal the completed-years calculation from DOB to Date of Assignment.',
    'Duplicate ExternalRowId, duplicate Patient Reg No, or duplicate exact patient/date/skill combinations are flagged for DUPLICATE_REVIEW, never silently removed.',
    'No clinical fact (diagnosis, finding, outcome, supervision level) may be invented when genuine source information is insufficient - the row is held (HOLD_FOR_REVIEW) instead.',
  ];
  rules.forEach((r) => sheet.addRow([r]));
  sheet.getColumn(1).width = 120;
  sheet.getColumn(1).alignment = { wrapText: true };
  return sheet;
}

function addSpecialtySkillReferenceSheet(wb: ExcelJS.Workbook, formMap: any) {
  const sheet = wb.addWorksheet('SpecialtySkillReference');
  sheet.addRow(['CaseType', 'SkillType', 'CombinationKey (leafId)', 'CompetencyItem', 'AllowedLevels']);
  sheet.getRow(1).font = { bold: true };
  for (const leaf of formMap.leaves ?? []) {
    const caseType = leaf.pathLabels?.[1] ?? '';
    const skillType = leaf.pathLabels?.[2] ?? '';
    const items = leaf.competencyGroup ?? [];
    if (items.length === 0) {
      sheet.addRow([caseType, skillType, leaf.leafId, '', '']);
      continue;
    }
    for (const item of items) {
      const levels = (item.log_entry_target ?? []).map((t: any) => t.compitency_level).filter(Boolean);
      sheet.addRow([caseType, skillType, leaf.leafId, item.particulars, levels.join(', ')]);
    }
  }
  sheet.columns = [{ width: 40 }, { width: 26 }, { width: 38 }, { width: 60 }, { width: 16 }];
  return sheet;
}

async function buildBlankWorkbook(opts: { includeFullSheetSet: boolean; specialty?: string; formMap?: any }): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  addDataEntrySheet(wb);
  if (opts.includeFullSheetSet) {
    addInputGuideSheet(wb);
    addValidationRulesSheet(wb);
    if (opts.formMap) addSpecialtySkillReferenceSheet(wb, opts.formMap);
    addHoldForReviewSheet(wb);
  } else {
    addHoldForReviewSheet(wb);
    addValidationSummarySheet(wb, opts.specialty);
  }
  return wb;
}

async function main() {
  const formMap = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'output', 'form-map.json'), 'utf-8'));

  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });

  // Phase 1: blank master AUTO template with the full 5-sheet set.
  const masterTemplateDir = path.join(OUTPUT_ROOT, 'Master-All-Surgical-Skills');
  fs.mkdirSync(masterTemplateDir, { recursive: true });
  const masterTemplateWb = await buildBlankWorkbook({ includeFullSheetSet: true, formMap });
  const masterTemplatePath = path.join(masterTemplateDir, 'BCPS_Auto_Data_Blank_Template_2026-09-10.xlsx');
  await masterTemplateWb.xlsx.writeFile(masterTemplatePath);
  console.log(`Blank master template written: ${masterTemplatePath}`);

  // Phase 24 shell: the Master workbook that will later hold the UNION of
  // all specialty DataEntry rows. Currently empty (0 genuine rows supplied).
  const masterWb = new ExcelJS.Workbook();
  addDataEntrySheet(masterWb);
  addHoldForReviewSheet(masterWb);
  addValidationSummarySheet(masterWb, 'ALL (Master)');
  const perSkillSheet = masterWb.addWorksheet('PerSkillCounts');
  perSkillSheet.addRow(['CaseType', 'SkillType', 'CompetencyItem', 'RowCount']);
  perSkillSheet.getRow(1).font = { bold: true };
  perSkillSheet.columns = [{ width: 40 }, { width: 26 }, { width: 60 }, { width: 12 }];
  const masterPath = path.join(masterTemplateDir, 'BCPS_Master_All_Surgical_Skills_2026-09-10.xlsx');
  await masterWb.xlsx.writeFile(masterPath);
  console.log(`Master workbook shell written (0 rows - no genuine source data supplied): ${masterPath}`);

  // Phase 2: one blank workbook per specialty.
  const specialtyPaths: { specialty: string; path: string }[] = [];
  for (const specialty of SPECIALTIES) {
    const slug = slugify(specialty);
    const dir = path.join(OUTPUT_ROOT, slug);
    fs.mkdirSync(dir, { recursive: true });
    const wb = await buildBlankWorkbook({ includeFullSheetSet: false, specialty });
    const filePath = path.join(dir, `BCPS_${slug}_2026-09-10.xlsx`);
    await wb.xlsx.writeFile(filePath);
    specialtyPaths.push({ specialty, path: filePath });
    console.log(`Blank specialty workbook written: ${filePath}`);
  }

  fs.writeFileSync(
    path.join(OUTPUT_ROOT, 'blank-template-manifest.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        masterTemplatePath,
        masterWorkbookPath: masterPath,
        specialtyWorkbooks: specialtyPaths,
        dataEntryColumns: DATA_ENTRY_COLUMNS,
        note: 'All DataEntry sheets are intentionally empty (header row only) - no genuine case data has been supplied for this run.',
      },
      null,
      2
    ),
    'utf-8'
  );
  console.log('Manifest written.');
}

main().catch((err) => {
  console.error('generate-blank-templates-2026-09-10 crashed:', err);
  process.exit(1);
});
