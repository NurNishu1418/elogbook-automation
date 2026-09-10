/**
 * Synthetic test-dataset generator for Vascular Surgery (Interpretative
 * Skill + Procedural skill).
 *
 * Like the Neurosurgery, Urology, Orthopaedic Surgery, Parasites of
 * Surgical Importance, and Paediatric Surgery datasets, this uses the
 * USER'S EXACT PROVIDED PER-SKILL COUNTS as the sole authority for row
 * counts - per explicit instruction, the portal's own mapped minimums
 * are NOT used to size this dataset. For this specialty the itemized
 * per-skill counts (3 + 5 Interpretative, 1x5 Procedural) sum exactly
 * to the stated totals (8 Interpretative + 5 Procedural = 13 Grand
 * Total) - there is no arithmetic discrepancy to resolve here. The live
 * portal IS still used (read-only, via output/form-map.json) to verify
 * exact skill names, field schemas, and valid competence levels - never
 * fabricated.
 *
 * All generated cases are written to be Vascular-Surgical-Unit
 * appropriate, with condition-specific adult ages (vascular disease
 * skews middle-aged/older adult; the one trauma-related vascular repair
 * case uses a plausible younger adult age) rather than a generic age
 * spread.
 *
 * Does NOT modify src/mapper, src/excel, or any existing file under
 * src/uploader - only imports and reuses existing exported functions
 * against a brand-new workbook, structurally copied from the real
 * output/BCPS_Logbook_Full_Mapping.xlsx (never modified). Dry-run only -
 * no login, no browser, no draft created.
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { logger } from '../utils/logger';
import { readDataEntryRows, DataEntryRow } from './excelReader';
import { validateRow, LeafForValidation } from './validateRow';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
const REAL_XLSX_PATH = path.join(OUTPUT_DIR, 'BCPS_Logbook_Full_Mapping.xlsx');

const SPECIALTY_DIR = path.join(PROJECT_ROOT, 'generated-data', 'Vascular-Surgery');
const DATE_RANGE_LABEL = '01-01-2026_to_30-06-2026';
const DATE_RANGE_DIR = path.join(SPECIALTY_DIR, DATE_RANGE_LABEL);
const GENERATED_DIR = path.join(DATE_RANGE_DIR, 'generated');
const REPORTS_DIR = path.join(DATE_RANGE_DIR, 'reports');
const CONFIG_PATH = path.join(SPECIALTY_DIR, 'specialty-config', 'vascular-surgery.json');

const DATASET_XLSX_PATH = path.join(GENERATED_DIR, 'BCPS_Logbook_Vascular_Surgery_01-01-2026_to_30-06-2026.xlsx');

const FORM_LABEL = 'Procedural and Interpretative Skills';
const CASE_TYPE_LABEL = 'Vascular Surgery';

const EXPECTED_INTERPRETATIVE_TOTAL = 8;
const EXPECTED_PROCEDURAL_TOTAL = 5;
const EXPECTED_GRAND_TOTAL = 13;

interface InterpScenario {
  diagnosis: string;
  notes: string;
  description: string;
  targetAge: number;
}
interface ProcScenario extends InterpScenario {
  level: string;
}

// ---------------------------------------------------------------------
// Clinical content - concise, FCPS-logbook style, Vascular-Surgical-
// Unit specific. Styled after the real BCPS Core Surgical Training
// logbook (style reference only - no real patient names, reg numbers,
// dates, ages, or patient-identifiable diagnoses were copied). Every
// diagnosis is deliberately matched to the exact skill/procedure and to
// a condition-appropriate adult age (vascular disease skews middle-aged/
// older adult; the one trauma-related repair uses a younger adult age)
// per the surgical-unit and age-realism rules. Skill-name keys below are
// copied verbatim from the portal-verified specialty config, including
// the trailing spaces on two Procedural skill names and the missing
// space before "MRA" in the Doppler/imaging skill name.
// ---------------------------------------------------------------------
const INTERPRETATIVE_SCENARIOS: Record<string, InterpScenario[]> = {
  'Angiogram/CT angiogram': [
    { diagnosis: 'Suspected peripheral arterial occlusion of the right lower limb.', notes: 'CT angiogram shows a discrete occlusion of the superficial femoral artery with distal reformation via collaterals.', description: 'CT angiogram for suspected peripheral arterial occlusion.', targetAge: 62 },
    { diagnosis: 'Peripheral arterial disease evaluation prior to revascularization.', notes: 'Angiogram shows multi-segment atherosclerotic narrowing of the femoro-popliteal segment with a patent distal run-off.', description: 'Angiogram for peripheral arterial disease evaluation.', targetAge: 58 },
    { diagnosis: 'Suspected infrarenal abdominal aortic aneurysm.', notes: 'CT angiogram shows a fusiform infrarenal aortic dilatation with mural thrombus, neck suitable for planning repair.', description: 'CT angiogram for suspected abdominal aortic aneurysm.', targetAge: 68 },
  ],
  'Color Doppler / Duplex imaging /MRA / MRV / DSA': [
    { diagnosis: 'Suspected deep vein thrombosis of the left lower limb.', notes: 'Colour Doppler shows a non-compressible, echogenic thrombus within the left femoral vein with absent flow augmentation.', description: 'Duplex study for suspected deep vein thrombosis.', targetAge: 55 },
    { diagnosis: 'Lower-limb arterial insufficiency assessment.', notes: 'Duplex imaging shows reduced triphasic-to-monophasic waveform conversion across the popliteal segment, consistent with proximal arterial insufficiency.', description: 'Duplex study for lower-limb arterial insufficiency.', targetAge: 60 },
    { diagnosis: 'Symptomatic carotid artery stenosis evaluation.', notes: 'Carotid duplex/MRA shows a high-grade stenosis at the internal carotid artery origin with turbulent flow.', description: 'Duplex/MRA for carotid artery stenosis evaluation.', targetAge: 65 },
    { diagnosis: 'Chronic venous insufficiency with varicose veins.', notes: 'Colour Doppler shows reflux exceeding 1 second at the sapheno-femoral junction with incompetent long saphenous vein.', description: 'Duplex study for varicose vein/venous insufficiency evaluation.', targetAge: 45 },
    { diagnosis: 'Pre-operative vessel mapping before arteriovenous fistula creation.', notes: 'Doppler vessel mapping shows an adequate-calibre cephalic vein and patent radial artery suitable for fistula formation.', description: 'Doppler vessel mapping before AV fistula creation.', targetAge: 50 },
  ],
};

const PROCEDURAL_SCENARIOS: Record<string, ProcScenario[]> = {
  'Arterial thrombo-embolectomy ': [
    { diagnosis: 'Acute limb ischemia of the right lower limb due to arterial embolism.', notes: 'Arterial thrombo-embolectomy performed via a femoral arteriotomy using a Fogarty balloon catheter with good back-bleeding and restoration of distal pulses.', description: 'Arterial thrombo-embolectomy for acute limb ischemia.', targetAge: 72, level: '2' },
  ],
  'Carotid end arterectomy': [
    { diagnosis: 'Symptomatic high-grade carotid artery stenosis.', notes: 'Carotid endarterectomy performed with removal of the atheromatous plaque from the internal carotid artery and patch closure of the arteriotomy.', description: 'Carotid endarterectomy for symptomatic carotid stenosis.', targetAge: 66, level: '2' },
  ],
  'Ligation and excision of hemangioma and aneurysm ': [
    { diagnosis: 'Popliteal artery aneurysm.', notes: 'Ligation and excision of the popliteal artery aneurysm performed with restoration of continuity by an interposition graft.', description: 'Ligation and excision of popliteal artery aneurysm.', targetAge: 64, level: '1' },
  ],
  'Use of vascular grafts': [
    { diagnosis: 'Occlusive peripheral vascular disease of the lower limb requiring arterial reconstruction.', notes: 'Femoro-popliteal bypass performed using a prosthetic vascular graft with confirmation of good distal flow on completion.', description: 'Use of vascular graft for arterial reconstruction.', targetAge: 61, level: '2' },
  ],
  'Vascular repair': [
    { diagnosis: 'Traumatic vascular injury of the upper limb following a road traffic accident.', notes: 'Vascular repair performed with primary end-to-end anastomosis of the injured artery and confirmation of distal perfusion.', description: 'Vascular repair for traumatic vascular injury.', targetAge: 28, level: '1' },
  ],
};

const MALE_FIRST = [
  'Md. Kamal', 'Abdul', 'Mohammad Arif', 'Md. Zahirul', 'Tanvir', 'Md. Nurul', 'Shahidul', 'Md. Rafiqul',
  'Golam', 'Md. Aminul', 'Habibur', 'Md. Shafiqul', 'Anisur', 'Md. Jahangir', 'Rezaul', 'Md. Mahbubur',
];
const FEMALE_FIRST = [
  'Rahima', 'Nasrin', 'Farzana', 'Salma', 'Sharmin', 'Rokeya', 'Shirin', 'Nasima', 'Marufa', 'Taslima',
  'Rehana', 'Shahnaz', 'Fatema', 'Rubina', 'Momena', 'Shahana', 'Rashida', 'Parveen', 'Halima', 'Aleya',
];
const SURNAMES = [
  'Hossain', 'Begum', 'Karim', 'Akter', 'Hasan', 'Yasmin', 'Islam', 'Khatun', 'Ahmed', 'Sultana',
  'Rahman', 'Chowdhury', 'Alam', 'Miah', 'Uddin', 'Khan', 'Talukder', 'Sarkar', 'Molla', 'Bhuiyan',
];

// Vascular disease (peripheral arterial disease, carotid stenosis,
// aneurysm, arterial embolism) skews somewhat male-predominant, but
// venous disease/varicose veins and hemangioma are common in females
// too - use a mildly male-skewed but mixed pool rather than an
// exclusively single-gender one.
function buildUniqueNamePool(count: number, seed: number): string[] {
  const names = new Set<string>();
  const firsts = shuffle([...MALE_FIRST, ...MALE_FIRST, ...FEMALE_FIRST], seed);
  const surnames = shuffle(SURNAMES, seed + 57);
  let i = 0;
  while (names.size < count) {
    const first = firsts[i % firsts.length];
    const surname = surnames[Math.floor(i / firsts.length) % surnames.length];
    names.add(`${first} ${surname}`);
    i++;
    if (i > count * 8) break;
  }
  return [...names];
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildUniqueRegNos(count: number, seed: number): string[] {
  const seen = new Set<string>();
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const result: string[] = [];
  while (result.length < count) {
    const part1 = 1000 + Math.floor(rand() * 9000);
    const part2 = Math.floor(rand() * 100);
    const regNo = `${part1}/${part2.toString().padStart(2, '0')}`;
    if (!seen.has(regNo)) {
      seen.add(regNo);
      result.push(regNo);
    }
  }
  return result;
}

// Assignment dates: allow same-date collisions across DIFFERENT rows (the
// established project convention permits "multiple cases may occur on
// the same day where plausible") - only patient identity fields
// (name/regNo/ExternalRowId) must stay unique, not the date itself.
function buildAssignmentDates(count: number, seed: number): string[] {
  const start = new Date('2026-01-01T00:00:00Z');
  const end = new Date('2026-06-30T00:00:00Z');
  const rangeDays = Math.floor((end.getTime() - start.getTime()) / 86400000);
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const offset = Math.floor(rand() * (rangeDays + 1));
    const d = new Date(start.getTime() + offset * 86400000);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function calculateAge(dobStr: string, assignmentDateStr: string): number {
  const dob = new Date(dobStr + 'T00:00:00Z');
  const assign = new Date(assignmentDateStr + 'T00:00:00Z');
  let age = assign.getUTCFullYear() - dob.getUTCFullYear();
  const hadBirthday = assign.getUTCMonth() > dob.getUTCMonth() || (assign.getUTCMonth() === dob.getUTCMonth() && assign.getUTCDate() >= dob.getUTCDate());
  if (!hadBirthday) age--;
  return age;
}

function computeVerifiedDob(assignmentDate: string, targetAge: number, seed: number): { dob: string; verifiedAge: number } {
  const assign = new Date(assignmentDate + 'T00:00:00Z');
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const birthYear = assign.getUTCFullYear() - targetAge;
  const assignMonth = assign.getUTCMonth();
  const assignDay = assign.getUTCDate();
  let birthMonth: number;
  let birthDay: number;
  if (assignMonth === 0 && assignDay === 1) {
    birthMonth = 0;
    birthDay = 1;
  } else {
    birthMonth = Math.floor(rand() * (assignMonth + 1));
    const maxDay = birthMonth === assignMonth ? assignDay : 28;
    birthDay = 1 + Math.floor(rand() * maxDay);
  }
  const dob = new Date(Date.UTC(birthYear, birthMonth, birthDay));
  // A DOB can legitimately land on the exact same calendar day as the
  // Assignment Date (birthMonth===assignMonth, birthDay===assignDay),
  // which computes the correct age but violates "DOB must be strictly
  // before Assignment Date." Nudge back one day rather than reject -
  // this keeps the completed age unchanged in every practical case
  // (including across a year boundary).
  if (dob.getTime() === assign.getTime()) {
    dob.setUTCDate(dob.getUTCDate() - 1);
  }
  const dobStr = dob.toISOString().slice(0, 10);
  const verifiedAge = calculateAge(dobStr, assignmentDate);
  return { dob: dobStr, verifiedAge };
}

interface InterpSkillDef {
  name: string;
  count: number;
}
interface ProcSkillDef {
  name: string;
  count: number;
  allowedLevels: string[];
}
interface Config {
  skills: { 'Interpretative Skill': InterpSkillDef[]; 'Procedural skill': ProcSkillDef[] };
}

interface GeneratedRow {
  externalRowId: string;
  skillType: 'Interpretative Skill' | 'Procedural skill';
  competencyItem: string;
  competenceLevel: string | null;
  patientName: string;
  patientRegNo: string;
  dateOfAssignment: string;
  dateOfBirth: string;
  age: number;
  diagnosis: string;
  notes: string;
  description: string;
}

function loadConfig(): Config {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function resolveDobAge(assignmentDate: string, targetAge: number, seedBase: number): { dob: string; age: number } {
  let { dob, verifiedAge } = computeVerifiedDob(assignmentDate, targetAge, seedBase);
  if (verifiedAge !== targetAge) {
    let fixed = computeVerifiedDob(assignmentDate, targetAge, seedBase + 1000);
    let attempts = 0;
    while (fixed.verifiedAge !== targetAge && attempts < 20) {
      fixed = computeVerifiedDob(assignmentDate, targetAge, seedBase + 2000 + attempts);
      attempts++;
    }
    if (fixed.verifiedAge !== targetAge) {
      throw new Error(`Could not generate a matching DOB/Age pair (target age ${targetAge}, date ${assignmentDate}).`);
    }
    dob = fixed.dob;
    verifiedAge = fixed.verifiedAge;
  }
  return { dob, age: verifiedAge };
}

function generateRows(config: Config, namePool: string[], regNoPool: string[]): GeneratedRow[] {
  const rows: GeneratedRow[] = [];
  let globalIndex = 0;

  for (const skill of config.skills['Interpretative Skill']) {
    const bank = INTERPRETATIVE_SCENARIOS[skill.name];
    if (!bank) throw new Error(`No clinical content scenarios authored for "${skill.name}" (Interpretative Skill). Refusing to fabricate generic content.`);
    if (bank.length !== skill.count) throw new Error(`Scenario bank size mismatch for "${skill.name}": config requires ${skill.count}, bank has ${bank.length}.`);
    const dates = buildAssignmentDates(skill.count, 41000 + globalIndex);
    for (let i = 0; i < skill.count; i++) {
      const scenario = bank[i];
      const { dob, age } = resolveDobAge(dates[i], scenario.targetAge, 51000 + globalIndex);
      rows.push({
        externalRowId: `VAS-${(globalIndex + 1).toString().padStart(3, '0')}`,
        skillType: 'Interpretative Skill',
        competencyItem: skill.name,
        competenceLevel: null,
        patientName: namePool[globalIndex],
        patientRegNo: regNoPool[globalIndex],
        dateOfAssignment: dates[i],
        dateOfBirth: dob,
        age,
        diagnosis: scenario.diagnosis,
        notes: scenario.notes,
        description: scenario.description,
      });
      globalIndex++;
    }
  }

  for (const skill of config.skills['Procedural skill']) {
    const bank = PROCEDURAL_SCENARIOS[skill.name];
    if (!bank) throw new Error(`No clinical content scenarios authored for "${skill.name}" (Procedural skill). Refusing to fabricate generic content.`);
    if (bank.length !== skill.count) throw new Error(`Scenario bank size mismatch for "${skill.name}": config requires ${skill.count}, bank has ${bank.length}.`);
    for (const scenario of bank) {
      if (!skill.allowedLevels.includes(scenario.level)) {
        throw new Error(`Scenario level "${scenario.level}" for "${skill.name}" is not in the configured allowed levels [${skill.allowedLevels.join(', ')}].`);
      }
    }
    const dates = buildAssignmentDates(skill.count, 42000 + globalIndex);
    for (let i = 0; i < skill.count; i++) {
      const scenario = bank[i];
      const { dob, age } = resolveDobAge(dates[i], scenario.targetAge, 52000 + globalIndex);
      rows.push({
        externalRowId: `VAS-${(globalIndex + 1).toString().padStart(3, '0')}`,
        skillType: 'Procedural skill',
        competencyItem: skill.name,
        competenceLevel: scenario.level,
        patientName: namePool[globalIndex],
        patientRegNo: regNoPool[globalIndex],
        dateOfAssignment: dates[i],
        dateOfBirth: dob,
        age,
        diagnosis: scenario.diagnosis,
        notes: scenario.notes,
        description: scenario.description,
      });
      globalIndex++;
    }
  }

  return rows;
}

async function createDatasetWorkbook(): Promise<void> {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  if (fs.existsSync(DATASET_XLSX_PATH)) {
    throw new Error(`Refusing to overwrite existing workbook: ${DATASET_XLSX_PATH}. Inspect it first or use a new date-range folder.`);
  }
  fs.copyFileSync(REAL_XLSX_PATH, DATASET_XLSX_PATH);
}

async function writeRowsIntoDataset(rows: GeneratedRow[], leaves: LeafForValidation[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(DATASET_XLSX_PATH);
  const ws = wb.getWorksheet('DataEntry');
  if (!ws) throw new Error('DataEntry sheet not found in dataset workbook.');

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

  while (ws.rowCount > 1) {
    ws.spliceRows(2, 1);
  }

  for (const r of rows) {
    const leaf = leaves.find((l) => l.pathLabels.join(' > ') === `${FORM_LABEL} > ${CASE_TYPE_LABEL} > ${r.skillType}`)!;
    let extraFields: Record<string, string>;
    let competencyChecked = '';

    if (r.skillType === 'Interpretative Skill') {
      extraFields = {
        'Indication/Investigation/Findings/Diagnosis': r.diagnosis,
        Interpretations: r.notes,
        'Brief Description': r.description,
      };
    } else {
      extraFields = {
        'Diagnosis/Problems': r.diagnosis,
        'Brief Procedural Notes': r.notes,
        'Brief Description': r.description,
      };
      competencyChecked = r.competencyItem;
    }

    const values: any[] = new Array(headers.length).fill(null);
    values[col.externalRowId] = r.externalRowId;
    values[col.action] = 'SAVE_DRAFT';
    values[col.combinationKey] = leaf.leafId;
    values[col.form] = FORM_LABEL;
    values[col.caseType] = CASE_TYPE_LABEL;
    values[col.skillType] = r.skillType;
    values[col.dateOfAssignment] = r.dateOfAssignment;
    values[col.nameOfPatient] = r.patientName;
    values[col.patientRegNo] = r.patientRegNo;
    values[col.dateOfBirth] = r.dateOfBirth;
    values[col.age] = String(r.age);
    values[col.competencyItems] = competencyChecked;
    values[col.extraFieldsJson] = JSON.stringify(extraFields);
    ws.addRow(values);
  }

  await wb.xlsx.writeFile(DATASET_XLSX_PATH);
}

function walkDir(dir: string): string[] {
  const out: string[] = [];
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(full);
    }
  }
  walk(dir);
  return out.sort();
}

async function main() {
  logger.info('Generating Vascular Surgery dataset (USER-PROVIDED EXACT COUNTS, dry-run only).');

  const realWorkbookStatBefore = fs.statSync(REAL_XLSX_PATH);
  const priorDatasetDirs = [
    'Basic-Surgical-Skill',
    'Gastrointestinal-HepatoBiliary-Pancreas',
    'Disorders-of-the-Breast',
    'Neurosurgery',
    'Urology',
    'Orthopaedic-Surgery',
    'Parasites-of-Surgical-Importance',
    'Paediatric-Surgery',
  ].map((name) => path.join(PROJECT_ROOT, 'generated-data', name));
  const priorDatasetSnapshotsBefore = priorDatasetDirs.map((dir) => (fs.existsSync(dir) ? JSON.stringify(walkDir(dir)) : null));

  if (fs.existsSync(DATE_RANGE_DIR) && fs.existsSync(DATASET_XLSX_PATH)) {
    logger.error(`Date-range folder/workbook already exists: ${DATASET_XLSX_PATH}. Refusing to overwrite. STOP.`);
    process.exit(1);
  }

  const config = loadConfig();
  const formMap = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'form-map.json'), 'utf-8'));
  const leaves: LeafForValidation[] = formMap.leaves.map((l: any) => ({
    leafId: l.leafId,
    pathLabels: l.pathLabels,
    fields: l.fields ?? [],
    competencyGroup: l.competencyGroup ?? [],
  }));

  const unmatched: { skillType: string; name: string }[] = [];
  const levelMismatches: { skillType: string; name: string; requestedLevel: string; validLevels: (string | null)[] }[] = [];
  const labelDifferences: { skillType: string; requestedName: string; portalName: string }[] = [];

  for (const skillType of ['Interpretative Skill', 'Procedural skill'] as const) {
    const leaf = leaves.find((l) => l.pathLabels.join(' > ') === `${FORM_LABEL} > ${CASE_TYPE_LABEL} > ${skillType}`);
    const skillList = skillType === 'Interpretative Skill' ? config.skills['Interpretative Skill'] : config.skills['Procedural skill'];
    for (const skill of skillList) {
      const competency = leaf?.competencyGroup.find((c) => c.particulars.trim() === skill.name.trim());
      if (!competency) {
        unmatched.push({ skillType, name: skill.name });
        continue;
      }
      if (competency.particulars !== skill.name) {
        labelDifferences.push({ skillType, requestedName: skill.name, portalName: competency.particulars });
      }
      if ('allowedLevels' in skill) {
        const validLevels: (string | null)[] = (competency as any).log_entry_target ? (competency as any).log_entry_target.map((t: any) => t.compitency_level) : [null];
        for (const level of (skill as ProcSkillDef).allowedLevels) {
          if (!validLevels.includes(level)) {
            levelMismatches.push({ skillType, name: skill.name, requestedLevel: level, validLevels });
          }
        }
      }
    }
  }
  if (unmatched.length > 0) {
    logger.error(`Unmatched skills - refusing to guess: ${JSON.stringify(unmatched)}`);
    process.exit(1);
  }
  if (levelMismatches.length > 0) {
    logger.error(`Invalid competence level(s) requested - refusing to fabricate: ${JSON.stringify(levelMismatches)}`);
    process.exit(1);
  }
  logger.info(`All 7 configured skills matched exactly to the mapped portal data (${labelDifferences.length} label difference(s) found), and all requested competence levels are portal-valid.`);

  const interpPlanned = config.skills['Interpretative Skill'].reduce((s, sk) => s + sk.count, 0);
  const procPlanned = config.skills['Procedural skill'].reduce((s, sk) => s + sk.count, 0);
  const totalRowsPlanned = interpPlanned + procPlanned;
  if (interpPlanned !== EXPECTED_INTERPRETATIVE_TOTAL || procPlanned !== EXPECTED_PROCEDURAL_TOTAL || totalRowsPlanned !== EXPECTED_GRAND_TOTAL) {
    logger.error(
      `Config totals (Interpretative=${interpPlanned}, Procedural=${procPlanned}, Grand=${totalRowsPlanned}) do not match the required exact totals (${EXPECTED_INTERPRETATIVE_TOTAL}/${EXPECTED_PROCEDURAL_TOTAL}/${EXPECTED_GRAND_TOTAL}). STOP.`
    );
    process.exit(1);
  }
  logger.info(`Total rows planned (USER-PROVIDED EXACT COUNTS, no arithmetic discrepancy for this specialty): ${totalRowsPlanned} (Interpretative=${interpPlanned}, Procedural=${procPlanned})`);

  const namePool = buildUniqueNamePool(totalRowsPlanned, 17877);
  const regNoPool = buildUniqueRegNos(totalRowsPlanned, 18988);

  const rows = generateRows(config, namePool, regNoPool);
  logger.info(`Generated ${rows.length} rows.`);

  const ageErrors: string[] = [];
  for (const r of rows) {
    const recomputed = calculateAge(r.dateOfBirth, r.dateOfAssignment);
    if (recomputed !== r.age) ageErrors.push(`${r.externalRowId}: DOB=${r.dateOfBirth}, AssignDate=${r.dateOfAssignment}, stored=${r.age}, recomputed=${recomputed}`);
    if (new Date(r.dateOfBirth) >= new Date(r.dateOfAssignment)) ageErrors.push(`${r.externalRowId}: DOB (${r.dateOfBirth}) is not before Assignment Date (${r.dateOfAssignment}).`);
  }
  if (ageErrors.length > 0) {
    logger.error(`DOB/Age verification FAILED for ${ageErrors.length} issue(s):`);
    ageErrors.forEach((e) => logger.error(`  ${e}`));
    process.exit(1);
  }
  logger.info('DOB/Age verification passed for all rows (DOB before Assignment Date, exact completed age, condition-appropriate adult age).');

  const nameSet = new Set(rows.map((r) => r.patientName));
  const regNoSet = new Set(rows.map((r) => r.patientRegNo));
  const rowIdSet = new Set(rows.map((r) => r.externalRowId));
  if (nameSet.size !== rows.length) throw new Error(`Duplicate patient names detected: ${rows.length - nameSet.size} collision(s).`);
  if (regNoSet.size !== rows.length) throw new Error(`Duplicate registration numbers detected: ${rows.length - regNoSet.size} collision(s).`);
  if (rowIdSet.size !== rows.length) throw new Error(`Duplicate ExternalRowIds detected: ${rows.length - rowIdSet.size} collision(s).`);
  const regNoFormatErrors = rows.filter((r) => !/^\d{4}\/\d{2}$/.test(r.patientRegNo));
  if (regNoFormatErrors.length > 0) throw new Error(`Registration number format violation(s): ${JSON.stringify(regNoFormatErrors.map((r) => r.patientRegNo))}`);
  for (const r of rows) {
    const d = new Date(r.dateOfAssignment + 'T00:00:00Z');
    if (d < new Date('2026-01-01T00:00:00Z') || d > new Date('2026-06-30T00:00:00Z')) throw new Error(`Row ${r.externalRowId} has an out-of-range assignment date: ${r.dateOfAssignment}`);
  }
  logger.info('Uniqueness (names, reg numbers, ExternalRowIds), registration-number format, and date-range verification passed for all rows.');

  await createDatasetWorkbook();
  logger.info(`Created dataset workbook (structural copy of the real mapping workbook): ${DATASET_XLSX_PATH}`);

  await writeRowsIntoDataset(rows, leaves);
  logger.info(`Wrote ${rows.length} rows into the dataset workbook's DataEntry sheet.`);

  const readRows: DataEntryRow[] = await readDataEntryRows(DATASET_XLSX_PATH);
  const draftRows = readRows.filter((r) => r.action === 'SAVE_DRAFT');
  const validationResults = draftRows.map((row) => ({ row, result: validateRow(row, leaves) }));
  const validCount = validationResults.filter((v) => v.result.valid).length;
  const invalidCount = validationResults.length - validCount;
  logger.info(`DRY RUN: ${draftRows.length} row(s), ${validCount} valid, ${invalidCount} invalid.`);
  for (const { row, result } of validationResults) {
    if (!result.valid) logger.error(`Row ${row.excelRow} (${row.externalRowId}) INVALID: ${result.errors.join(' | ')}`);
  }

  const perSkillCounts: Record<string, { requested: number; actual: number }> = {};
  for (const skill of config.skills['Interpretative Skill']) {
    const actual = rows.filter((r) => r.skillType === 'Interpretative Skill' && r.competencyItem === skill.name).length;
    perSkillCounts[`Interpretative Skill > ${skill.name}`] = { requested: skill.count, actual };
  }
  for (const skill of config.skills['Procedural skill']) {
    const actual = rows.filter((r) => r.skillType === 'Procedural skill' && r.competencyItem === skill.name).length;
    perSkillCounts[`Procedural skill > ${skill.name}`] = { requested: skill.count, actual };
  }
  const perLevelUsage = config.skills['Procedural skill'].map((skill) => ({
    skill: skill.name,
    allowedLevels: skill.allowedLevels,
    levelsUsed: rows.filter((r) => r.skillType === 'Procedural skill' && r.competencyItem === skill.name).map((r) => r.competenceLevel),
  }));

  const interpTotal = rows.filter((r) => r.skillType === 'Interpretative Skill').length;
  const procTotal = rows.filter((r) => r.skillType === 'Procedural skill').length;

  fs.writeFileSync(
    path.join(REPORTS_DIR, 'row-count-summary.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), totalRows: rows.length, interpretativeTotal: interpTotal, proceduralTotal: procTotal, perSkill: perSkillCounts, procedural_competenceLevelUsage: perLevelUsage }, null, 2),
    'utf-8'
  );

  const dryRunReport = {
    generatedAt: new Date().toISOString(),
    datasetWorkbook: DATASET_XLSX_PATH,
    totalRows: draftRows.length,
    validRows: validCount,
    invalidRows: invalidCount,
    rows: validationResults.map(({ row, result }) => ({ externalRowId: row.externalRowId, valid: result.valid, errors: result.errors })),
  };
  fs.writeFileSync(path.join(REPORTS_DIR, 'dry-run-validation-report.json'), JSON.stringify(dryRunReport, null, 2), 'utf-8');

  const validationErrorReport = {
    generatedAt: new Date().toISOString(),
    totalErrors: validationResults.reduce((sum, v) => sum + v.result.errors.length, 0),
    errorsByRow: validationResults.filter((v) => !v.result.valid).map((v) => ({ externalRowId: v.row.externalRowId, errors: v.result.errors })),
  };
  fs.writeFileSync(path.join(REPORTS_DIR, 'validation-error-report.json'), JSON.stringify(validationErrorReport, null, 2), 'utf-8');

  fs.writeFileSync(
    path.join(REPORTS_DIR, 'mapping-match-report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), totalSkillsRequested: 7, totalSkillsMatched: 7, unmatchedSkills: unmatched, labelDifferences, levelMismatches }, null, 2),
    'utf-8'
  );

  const realWorkbookStatAfter = fs.statSync(REAL_XLSX_PATH);
  const originalWorkbookUnchanged = realWorkbookStatBefore.size === realWorkbookStatAfter.size && realWorkbookStatBefore.mtimeMs === realWorkbookStatAfter.mtimeMs;
  const priorDatasetChecks: Record<string, boolean> = {};
  priorDatasetDirs.forEach((dir, i) => {
    const name = path.basename(dir);
    const before = priorDatasetSnapshotsBefore[i];
    const after = fs.existsSync(dir) ? JSON.stringify(walkDir(dir)) : null;
    priorDatasetChecks[name] = before === after;
  });

  const generationSummary = {
    generatedAt: new Date().toISOString(),
    specialty: 'Vascular Surgery',
    trainingContext: 'Vascular Surgical Unit',
    dateRange: { label: DATE_RANGE_LABEL, from: '2026-01-01', to: '2026-06-30' },
    datasetWorkbook: DATASET_XLSX_PATH,
    quotaDecision: {
      countSource: 'USER_PROVIDED_EXACT_COUNTS_ITEMIZED',
      portalQuotaUsedToSizeDataset: false,
      arithmeticDiscrepancy: 'None for this specialty - the itemized per-skill counts (3+5=8 Interpretative, 1x5=5 Procedural) sum exactly to the stated totals (8+5=13). Verified programmatically before generation.',
      reason: "Per explicit user instruction, this dataset uses the exact per-skill counts the user provided (8 Interpretative + 5 Procedural = 13). The portal's own mapped minimums were NOT used to size this dataset - recorded in specialty-config/vascular-surgery.json for traceability only.",
    },
    competenceLevelHandling: 'Each of the 5 Procedural skills has exactly 1 row despite having 2 valid competence levels (1 and 2) each - the level was NOT multiplied into extra rows. One portal-valid level was selected per skill - see procedural_competenceLevelUsage in row-count-summary.json for the exact level used per row.',
    ageRealism: 'Every row uses a condition-specific adult age rather than a generic spread - vascular disease (peripheral arterial disease, carotid stenosis, aortic/peripheral aneurysm, arterial embolism) uses middle-aged to older adult ages (45-72), while the one trauma-related vascular repair case uses a plausible younger adult age (28).',
    totals: { interpretative: interpTotal, procedural: procTotal, grandTotal: rows.length },
    skillsGenerated: Object.entries(perSkillCounts).map(([k, v]) => ({ skill: k, requested: v.requested, actual: v.actual, matches: v.requested === v.actual })),
    unmatchedSkills: unmatched,
    labelDifferences,
    levelMismatches,
    liveActionsTaken: 'None. This generator only reads the existing local output/form-map.json (produced by a prior, already-approved live mapping crawl) - no login, browser, or network action was performed by this script. No Save as Draft, no Final Submit, no portal data modified.',
    originalMappingWorkbookUnchanged: originalWorkbookUnchanged,
    priorSpecialtyDatasetsUnchanged: priorDatasetChecks,
    reviewStatus: 'PENDING MANUAL REVIEW',
    uploadStatus: 'NOT UPLOADED',
  };
  fs.writeFileSync(path.join(REPORTS_DIR, 'generation-summary.json'), JSON.stringify(generationSummary, null, 2), 'utf-8');
  fs.writeFileSync(path.join(REPORTS_DIR, 'generated-rows-raw.json'), JSON.stringify(rows, null, 2), 'utf-8');

  logger.info(`Wrote all report files to ${REPORTS_DIR}`);
  logger.info(`originalMappingWorkbookUnchanged=${originalWorkbookUnchanged}, priorSpecialtyDatasetsUnchanged=${JSON.stringify(priorDatasetChecks)}`);
  logger.info('STOPPED after dry-run validation, as instructed. No login/browser/draft action was performed by this generator.');
}

main().catch((err) => {
  logger.error(`generate-vascular-surgery-dataset crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
