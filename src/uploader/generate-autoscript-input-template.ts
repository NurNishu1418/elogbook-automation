/**
 * Builds the permanent, reusable manual-input workbook for the CURRENT
 * autoscript (src/uploader/run-workbook.ts, driven by
 * UPLOAD_WORKBOOK_PATH). Pure local file generation - zero portal contact.
 *
 * Never overwrites an existing file at the target path; versions instead.
 * Never touches anything else under generated-data/.
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
const TARGET_DIR = path.join(PROJECT_ROOT, 'generated-data', 'AutoScript-Input');

const DATA_ENTRY_HEADER = [
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

const BASIC_SURGICAL_ALLOWED_LEVELS: Record<string, string[]> = {
  'Ability to use Surgical instruments and energy devices': ['2', '3'],
  'Accurate and safe administration of local anaesthetic agent': ['2', '3'],
  'Application and removal of skin staples/stitches': ['2', '3'],
  'Biopsy techniques (Core-cut biopsy, excision biopsy, incision biopsy)': ['2', '3'],
  'Central venous catheterization': ['1', '2', '3'],
  'Drainage of superficial abscesses including Hilton’s method': ['2', '3', '4'],
  'Excision biopsy of benign lesions (lipoma, cyst, skin lesions etc.)': ['2', '3', '4'],
  'Exposure, antiseptic washand draping': ['2', '3'],
  'Handling a Procedural specimen': ['3', '4'],
  'Intravenous cannulation': ['4'],
  'Introduction and removal of Procedural drains': ['1', '2', '3'],
  'Positioning of the patient': ['2', '3'],
  'Safe tying of knots (hand/instrumental/on the surface and at depth)': ['2', '3'],
  'Securing bleeding vessels': ['2', '3'],
  'Skin incision and closure': ['2', '3'],
  'Surgical Ritual (Effective and safe hand washing, donning and doffing)': ['3', '4'],
  'Urinary bladder catheterization': ['3', '4'],
};

function findAvailablePath(baseDir: string, baseName: string, ext: string): string {
  let candidate = path.join(baseDir, `${baseName}${ext}`);
  if (!fs.existsSync(candidate)) return candidate;
  let v = 2;
  while (fs.existsSync((candidate = path.join(baseDir, `${baseName}_v${v}${ext}`)))) v++;
  return candidate;
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
  const formMap = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'form-map.json'), 'utf-8'));
  const inv = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'basic-surgical-skill-inventory.json'), 'utf-8'));
  const review = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'procedural-level-multi-level-review.json'), 'utf-8'));
  const invById = new Map(inv.rows.map((r: any) => [r.entryId, r]));

  const unresolvedBSS = review.rows.filter((r: any) => r.caseType === 'Basic Surgical Skill');
  console.log(`Authoritative unresolved Basic Surgical Skill count (from procedural-level-multi-level-review.json): ${unresolvedBSS.length}`);

  fs.mkdirSync(TARGET_DIR, { recursive: true });
  const outputPath = findAvailablePath(TARGET_DIR, 'BCPS_AutoScript_Final_Input_Template', '.xlsx');

  const wb = new ExcelJS.Workbook();

  // ---------------- Sheet 1: DataEntry ----------------
  const dataEntry = wb.addWorksheet('DataEntry');
  dataEntry.addRow(DATA_ENTRY_HEADER);
  dataEntry.columns.forEach((c) => (c.width = 30));
  styleHeaderRow(dataEntry);

  // ---------------- UploadResult (required by run-workbook.ts for --execute) ----------------
  const uploadResult = wb.addWorksheet('UploadResult');
  uploadResult.addRow(['ExternalRowId', 'Excel Row', 'Processing Status', 'Draft Reference', 'Attempt Time', 'Failed Field', 'Error Message', 'Screenshot Path']);
  styleHeaderRow(uploadResult);

  // ---------------- Sheet 2: InputGuide ----------------
  const guide = wb.addWorksheet('InputGuide');
  guide.addRow(['ColumnName', 'RequiredOrOptional', 'ExpectedFormat', 'Example', 'Purpose', 'CommonError']);
  styleHeaderRow(guide);
  const guideRows: string[][] = [
    ['ExternalRowId', 'Required', 'Unique text per row within this workbook', 'BSS-2026-001', 'Your own manual row identifier - never re-used, used to detect already-uploaded rows.', 'Reusing an ID from a previous batch causes the row to be silently skipped as ALREADY_DONE.'],
    ['Action', 'Required', 'Exactly "SAVE_DRAFT" - the only value the current uploader (run-workbook.ts / run.ts) reads and acts on', 'SAVE_DRAFT', 'Rows without this exact value are ignored entirely.', 'Typing "Save Draft" or "SAVEDRAFT" causes the row to be silently ignored, not held.'],
    ['CombinationKey', 'Required', 'The exact leafId (GUID) for this Form>CaseType>SkillType path, from SpecialtySkillReference', '18aab29a-bb60-4aad-965e-a669ab6648bf', "Tells the uploader exactly which mapped combination this row targets - resolved directly against output/form-map.json, never guessed from the text columns.", 'Leaving this blank or mistyped causes validateRow.ts to report "combination not found".'],
    ['Form', 'Required', 'Exact portal Form label', 'Procedural and Interpretative Skills', 'Must match the CombinationKey\'s own Form exactly (cross-checked).', 'A mismatch between Form and CombinationKey fails validation.'],
    ['CaseType', 'Required', 'Exact portal Case Type label', 'Basic Surgical Skill', 'Must match the CombinationKey\'s own CaseType exactly.', 'Mismatch fails validation.'],
    ['SkillType', 'Required', 'Exact portal Skill Type label', 'Procedural skill', 'Must match the CombinationKey\'s own SkillType exactly.', 'Mismatch fails validation.'],
    ['Date of Assignment (YYYY-MM-DD)', 'Required', 'ISO date, e.g. 2026-03-15', '2026-03-15', 'The genuine date the case/skill occurred.', 'Any other date format (DD/MM/YYYY etc.) is not parsed correctly by the current reader.'],
    ['Name of the Patient', 'Required', 'Free text, genuine supplied name only', 'Md. Kamal Hossain', 'Patient identity - never invent, never copy from an unrelated case.', ''],
    ['Patient Reg No', 'Required', 'Free text, portal format typically ####/##', '4267/24', 'Patient registration number.', 'Duplicate Reg Nos across rows are not auto-detected by validateRow.ts today - review manually.'],
    ['Date of Birth (YYYY-MM-DD)', 'Required', 'ISO date', '1974-01-25', 'Used together with Date of Assignment to validate Age.', 'DOB on/after Date of Assignment fails validation.'],
    ['Age', 'Required', 'Completed years on Date of Assignment', '52', 'Must exactly match the DOB-to-Assignment-Date calculation.', 'A mismatched Age fails validation even if DOB and date are individually correct.'],
    ['CompetencyItemsChecked (semicolon-separated)', 'Required for Procedural/Interpretative/Communication rows', 'Exact mapped competency label(s); separate multiple with ";"', 'Intravenous cannulation', 'Tells the uploader exactly which competency checkbox(es) to check - must match the live portal label exactly (spelling, spacing, punctuation) per SpecialtySkillReference.', 'A label that does not exactly match the mapped text (e.g. missing a space, wrong case) fails validation rather than being auto-corrected.'],
    ['ExtraFieldsJSON', 'Required when the combination has dynamic fields', 'A JSON object - only keys mapped for this exact leaf, plus the reserved "CompetencyLevel" key for Procedural rows', '{"Diagnosis/Problems":"...","Brief Procedural Notes":"...","Brief Description":"...","CompetencyLevel":"4"}', 'Supplies every dynamic field beyond the fixed columns.', 'Any key not in ExtraFieldsReference for this exact leaf is rejected as an unknown field - never silently accepted.'],
  ];
  guideRows.forEach((r) => guide.addRow(r));
  guide.columns = [{ width: 32 }, { width: 20 }, { width: 40 }, { width: 45 }, { width: 55 }, { width: 55 }];
  guide.eachRow((row) => row.eachCell((cell) => (cell.alignment = { wrapText: true, vertical: 'top' })));

  const noteRow = guide.addRow(['NOTE', '', '', '', 'This workbook is read by src/uploader/run-workbook.ts via the UPLOAD_WORKBOOK_PATH environment variable - NOT by npm run upload:dry-run/upload:drafts (those are hardcoded to a different file, output/BCPS_Logbook_Full_Mapping.xlsx, and are not the long-term workflow for this workbook).', '', '']);
  noteRow.font = { italic: true };
  const noteRow2 = guide.addRow(['NOTE', '', '', '', 'The BasicSurgical-LevelDecision sheet is a separate manual decision workspace. Choosing a ChosenLevel there does NOT itself upload or modify anything - it is not read by the uploader. Approved levels must be manually transferred into DataEntry (or a dedicated repair workbook/process) before they take effect.', '', '']);
  noteRow2.font = { italic: true };

  // ---------------- Sheet 3: SpecialtySkillReference ----------------
  const specRef = wb.addWorksheet('SpecialtySkillReference');
  specRef.addRow(['Form', 'CaseType', 'SkillType', 'CombinationKey', 'CompetencyItem', 'AllowedCompetencyLevels', 'ProceduralLevelRequired', 'RequiredDynamicFields', 'OptionalVisibleDynamicFields', 'KnownHoldOrWarning']);
  styleHeaderRow(specRef);
  for (const leaf of formMap.leaves ?? []) {
    const form = leaf.pathLabels?.[0] ?? '';
    const caseType = leaf.pathLabels?.[1] ?? '';
    const skillType = leaf.pathLabels?.[2] ?? '';
    const requiredFields = (leaf.fields ?? []).filter((f: any) => f.required_ind === 1 && !['Date of Assignment', 'Name of the Patient', 'Patient Reg. No', 'Date of Birth', 'Age'].includes(f.column_name)).map((f: any) => f.column_name);
    const optionalFields = (leaf.fields ?? []).filter((f: any) => f.required_ind !== 1 && f.column_value_type !== 'checkbox').map((f: any) => f.column_name);
    const isVascular = caseType === 'Vascular Surgery';
    const items = leaf.competencyGroup ?? [];
    if (items.length === 0) {
      specRef.addRow([
        form,
        caseType,
        skillType,
        leaf.leafId,
        '',
        '',
        'No',
        requiredFields.join('; '),
        optionalFields.join('; '),
        isVascular ? 'PORTAL_ROUTING_HOLD: selecting Vascular Surgery as Case Type is a confirmed live bug that loads Thoracic and Cardiovascular Surgery\'s schema instead - never route around this.' : '',
      ]);
      continue;
    }
    for (const item of items) {
      const levels = (item.log_entry_target ?? []).map((t: any) => t.compitency_level).filter((l: any) => l !== null && l !== undefined && l !== '');
      const hasLevel5 = levels.includes('5');
      let hold = isVascular ? 'PORTAL_ROUTING_HOLD: Vascular Surgery Case Type selection loads Thoracic schema instead (confirmed live bug).' : '';
      if (hasLevel5) hold = (hold ? hold + ' | ' : '') + 'LEVEL5_PORTAL_HOLD: mapped level "5" has no corresponding portal checkbox (only Level 1-4 exist) - never substitute Level 4.';
      specRef.addRow([
        form,
        caseType,
        skillType,
        leaf.leafId,
        item.particulars,
        levels.join(', '),
        skillType === 'Procedural skill' && levels.length > 0 ? 'Yes' : 'No',
        requiredFields.join('; '),
        optionalFields.join('; '),
        hold,
      ]);
    }
  }
  specRef.columns = [{ width: 32 }, { width: 40 }, { width: 26 }, { width: 38 }, { width: 60 }, { width: 20 }, { width: 20 }, { width: 40 }, { width: 40 }, { width: 60 }];

  // ---------------- Sheet 4: ValidationRules ----------------
  const rulesSheet = wb.addWorksheet('ValidationRules');
  rulesSheet.addRow(['Rule', 'AppliesTo', 'CODE_ENFORCED_OR_GUIDANCE', 'Description', 'FailureBehavior']);
  styleHeaderRow(rulesSheet);
  const rules: string[][] = [
    ['Required headers: ExternalRowId, Action, Form, CaseType', 'All rows', 'CODE_ENFORCED', 'excelReader.ts throws if any of these 4 headers is missing from row 1 of DataEntry.', 'Workbook is rejected entirely before any row is read.'],
    ['CompetencyItemsChecked column must be named exactly "CompetencyItemsChecked (semicolon-separated)"', 'All rows', 'CODE_ENFORCED', 'excelReader.ts looks up this exact header string; there is no fallback to a plainer name.', 'If misnamed, competency items are silently read as empty for every row (not an error - a silent gap), so verified directly in this project.'],
    ['Action must equal "SAVE_DRAFT" to be processed', 'All rows', 'CODE_ENFORCED', 'run.ts and run-workbook.ts both filter rows by row.action === \'SAVE_DRAFT\'.', 'Any other value (including blank) is silently excluded from processing - not flagged as an error.'],
    ['CombinationKey must resolve to a real leaf in form-map.json', 'All rows', 'CODE_ENFORCED', 'validateRow.ts resolves the leaf by id and fails the row if not found.', 'Row marked invalid; never processed live.'],
    ['Form / CaseType / SkillType must match the resolved leaf\'s own pathLabels', 'All rows', 'CODE_ENFORCED', 'validateRow.ts cross-checks all three text columns against the leaf resolved via CombinationKey.', 'Mismatch fails the row.'],
    ['CompetencyItemsChecked label(s) must exactly match a mapped competency item for that leaf', 'All rows', 'CODE_ENFORCED', 'No normalization/fuzzy matching is performed - spelling, spacing and punctuation must match exactly.', 'Unmatched label fails the row.'],
    ['ExtraFieldsJSON must be valid JSON and contain only mapped keys (plus the reserved "CompetencyLevel" key)', 'All rows', 'CODE_ENFORCED', 'validateRow.ts parses the JSON and checks every key against the leaf\'s known dynamic fields; "CompetencyLevel" is explicitly whitelisted as a reserved tool-control key, never treated as an unknown field.', 'Invalid JSON or an unrecognized key fails the row.'],
    ['Procedural rows must carry exactly one CompetencyLevel, drawn only from that skill\'s allowed level set', 'Procedural skill rows', 'CODE_ENFORCED', 'validateRow.ts requires CompetencyLevel in ExtraFieldsJSON whenever the checked item has more than one valid level, and validates it against the mapped allowed set; a single-valid-level skill can resolve deterministically without an explicit value.', 'Missing, multiple, or invalid level fails the row - it is never guessed or defaulted.'],
    ['DOB must be before Date of Assignment; Age must match the DOB-to-Assignment-Date completed-years calculation', 'All rows', 'CODE_ENFORCED', 'Checked directly by validateRow.ts.', 'Mismatch fails the row.'],
    ['Duplicate portal entries are checked before creating anything', 'run-workbook.ts --execute only', 'CODE_ENFORCED', 'fetchRecentEntries + findMatchingEntry search the portal\'s own recent entries for a match before any Save as Draft is attempted.', 'A matching existing entry causes the row to be SKIPPED_DUPLICATE, never re-created.'],
    ['Duplicate ExternalRowId or duplicate Patient Reg No across DataEntry rows', 'All rows', 'GUIDANCE_ONLY', 'Not currently checked by validateRow.ts or run-workbook.ts - review manually before running.', 'No automatic rejection today; would currently be processed as separate rows.'],
    ['3 consecutive row failures stop the whole run', 'run-workbook.ts --execute only', 'CODE_ENFORCED', 'A circuit breaker halts further processing after 3 consecutive FAILED rows, on the assumption something systemic is wrong.', 'Remaining eligible rows are left unprocessed; re-run after investigating.'],
    ['A "<workbook>.stop.flag" file halts the run cleanly before the next row', 'run-workbook.ts --execute only', 'CODE_ENFORCED', 'Checked at the start of every row iteration - never mid-fill.', 'Run stops cleanly; can be resumed later by re-running (already-done rows are skipped).'],
    ['Session re-login mid-run if the portal redirects to the login page', 'run-workbook.ts --execute only', 'CODE_ENFORCED', 'Detected via URL/password-field check before each row; re-authenticates and retries navigation.', 'If re-login itself fails, that row throws and is recorded as FAILED.'],
    ['Post-save verification: the saved entry is re-fetched from the portal\'s own list and every field compared', 'run-workbook.ts --execute only', 'CODE_ENFORCED', 'compareEntryToRow checks the freshly-saved entry against the submitted row, not just "a draft now exists".', 'A mismatch is recorded as FAILED even though a draft row exists, rather than being reported as success.'],
    ['Dry-run performs zero login and zero browser launch', 'run-workbook.ts default (no --execute)', 'CODE_ENFORCED (added this session)', 'The --execute check happens before any browser/login code runs at all.', 'Running without --execute can never touch the portal, by construction.'],
    ['Save as Draft is the only click ever performed; Final Submit is never clicked', 'run-workbook.ts / run.ts / fillForm.ts', 'CODE_ENFORCED', 'No code path in fillAndSaveDraft or either runner references a Submit/Final Submit action.', 'Not applicable - the action does not exist in this codebase.'],
    ['Level "5" (e.g. Abdominal Wall inguinal hernia) is never substituted with an available level', 'Procedural rows mapped to level 5', 'CODE_ENFORCED', 'resolveLevelFromValidLevels in fillForm.ts returns "unselectable-level" for a level with no corresponding DOM checkbox and never substitutes another value.', 'Row fails with an explicit LEVEL5_PORTAL_UI_HOLD-style error rather than being silently altered.'],
    ['Vascular Surgery Case Type selection may load Thoracic and Cardiovascular Surgery\'s schema instead (confirmed live bug)', 'Vascular Surgery rows', 'GUIDANCE_ONLY (not currently code-blocked)', 'This is a live portal/frontend defect, not something this codebase can detect purely from a DataEntry row - hold these rows manually until independently verified safe.', 'No automatic block exists today; treat as a manual PORTAL_ROUTING_HOLD.'],
  ];
  rules.forEach((r) => rulesSheet.addRow(r));
  rulesSheet.columns = [{ width: 55 }, { width: 30 }, { width: 30 }, { width: 70 }, { width: 55 }];
  rulesSheet.eachRow((row, n) => { if (n > 1) row.eachCell((cell) => (cell.alignment = { wrapText: true, vertical: 'top' })); });

  // ---------------- Sheet 5: ExtraFieldsReference ----------------
  const extraRef = wb.addWorksheet('ExtraFieldsReference');
  extraRef.addRow(['Form', 'CaseType', 'SkillType', 'CombinationKey', 'PortalFieldLabel', 'JSONKey', 'RequiredOrOptional', 'FieldType', 'ExampleValue', 'Notes']);
  styleHeaderRow(extraRef);
  for (const leaf of formMap.leaves ?? []) {
    const form = leaf.pathLabels?.[0] ?? '';
    const caseType = leaf.pathLabels?.[1] ?? '';
    const skillType = leaf.pathLabels?.[2] ?? '';
    const universal = new Set(['Date of Assignment', 'Name of the Patient', 'Patient Reg. No', 'Date of Birth', 'Age']);
    for (const f of leaf.fields ?? []) {
      if (universal.has(f.column_name) || f.column_value_type === 'checkbox') continue;
      extraRef.addRow([
        form,
        caseType,
        skillType,
        leaf.leafId,
        f.column_name,
        f.column_name,
        f.required_ind === 1 ? 'Required' : 'Optional',
        f.column_value_type,
        f.column_name.toLowerCase().includes('date') ? '2026-03-15' : 'Genuine supplied text',
        '',
      ]);
    }
    if ((leaf.pathLabels?.[2] === 'Procedural skill') && (leaf.competencyGroup ?? []).some((c: any) => (c.log_entry_target ?? []).length > 0)) {
      extraRef.addRow([form, caseType, skillType, leaf.leafId, '(reserved tool-control key, not a portal field)', 'CompetencyLevel', 'Required when the checked item has more than one allowed level', 'reserved', '4', 'Supplied through ExtraFieldsJSON, e.g. {"CompetencyLevel":"4"}. Do not imply any specific level is universally appropriate - it must come from genuine case evidence or an explicit human decision, never a default.']);
    }
  }
  extraRef.columns = [{ width: 32 }, { width: 40 }, { width: 26 }, { width: 38 }, { width: 45 }, { width: 30 }, { width: 45 }, { width: 14 }, { width: 30 }, { width: 60 }];
  extraRef.eachRow((row, n) => { if (n > 1) row.eachCell((cell) => (cell.alignment = { wrapText: true, vertical: 'top' })); });

  // ---------------- Sheet 6: BasicSurgical-LevelDecision ----------------
  const levelSheet = wb.addWorksheet('BasicSurgical-LevelDecision');
  levelSheet.addRow(['EntryID', 'PatientRegNo', 'SkillName', 'DiagnosisProblems', 'BriefProceduralNotes', 'BriefDescription', 'MappedAllowedLevels', 'ChosenLevel', 'DecisionStatus']);
  styleHeaderRow(levelSheet);

  const seenIds = new Set<string>();
  let dropdownCount = 0;
  for (const entry of unresolvedBSS) {
    if (seenIds.has(entry.portalEntryId)) continue; // safety: never duplicate an EntryID
    seenIds.add(entry.portalEntryId);
    const invRow: any = invById.get(entry.portalEntryId);
    const cf = invRow ? invRow.clinicalFields : {};
    const allowed = BASIC_SURGICAL_ALLOWED_LEVELS[entry.proceduralSkill.trim()] ?? [];
    const rowNumber = levelSheet.rowCount + 1;
    levelSheet.addRow([
      entry.portalEntryId,
      entry.patientRegNo,
      entry.proceduralSkill,
      cf.diagnosisProblems ?? '',
      cf.briefProceduralNotes ?? '',
      cf.briefDescription ?? '',
      allowed.join(','),
      '', // ChosenLevel - always blank
      'WAITING_FOR_HUMAN_LEVEL',
    ]);
    if (allowed.length > 0) {
      const cell = levelSheet.getCell(`H${rowNumber}`);
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${allowed.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid competency level',
        error: `This skill only allows level(s): ${allowed.join(', ')}.`,
        showInputMessage: true,
        promptTitle: 'Choose one allowed level',
        prompt: `Allowed for this skill: ${allowed.join(', ')}. Leave blank if undecided.`,
      };
      dropdownCount++;
    }
  }
  levelSheet.columns = [{ width: 38 }, { width: 16 }, { width: 45 }, { width: 45 }, { width: 45 }, { width: 40 }, { width: 20 }, { width: 14 }, { width: 26 }];
  levelSheet.eachRow((row, n) => { if (n > 1) row.eachCell((cell) => (cell.alignment = { wrapText: true, vertical: 'top' })); });
  // Visually mark ChosenLevel as the human-input column.
  levelSheet.getColumn(8).eachCell((cell, rowNum) => {
    if (rowNum === 1) return;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
  });

  // ---------------- Sheet 7: HoldForReview ----------------
  const hold = wb.addWorksheet('HoldForReview');
  hold.addRow(['ExternalRowId', 'Reason', 'Field', 'CurrentValue', 'ExpectedOrAllowedValue', 'RecommendedAction', 'Status']);
  styleHeaderRow(hold);
  hold.columns = [{ width: 20 }, { width: 30 }, { width: 24 }, { width: 30 }, { width: 30 }, { width: 40 }, { width: 20 }];

  fs.writeFileSync;
  await wb.xlsx.writeFile(outputPath);
  console.log(`Workbook written: ${outputPath}`);
  console.log(`BasicSurgical-LevelDecision rows: ${seenIds.size}, dropdowns applied: ${dropdownCount}`);
}

main().catch((err) => {
  console.error('generate-autoscript-input-template crashed:', err);
  process.exit(1);
});
