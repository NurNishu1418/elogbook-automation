/**
 * Synthetic test-dataset generator for Skin and Subcutaneous Tissue
 * (Interpretative Skill + Procedural skill).
 *
 * Like the Neurosurgery, Urology, Orthopaedic Surgery, Parasites of
 * Surgical Importance, and Paediatric Surgery datasets, this uses the
 * USER'S EXACT PROVIDED PER-SKILL COUNTS as the sole authority for row
 * counts - per explicit instruction, the portal's own mapped minimums
 * are NOT used to size this dataset, and are recorded only for
 * traceability in the specialty config. The live portal IS still used
 * (read-only, via output/form-map.json) to verify exact skill names,
 * field schemas, and valid competence levels - never fabricated.
 *
 * The itemized per-skill counts for this specialty sum exactly to the
 * stated totals with no discrepancy: Interpretative (3+3=6) + Procedural
 * (3+3+1+1+1+3+3+3+3+3=24) = 30. See
 * specialty-config/skin-subcutaneous-tissue.json -> quotaSource for
 * full detail.
 *
 * Two of the Procedural skill names here ("Fasciotomy", "Wound
 * debridement") are IDENTICAL in label to skills used in OTHER
 * specialties (Plastic Surgery, Accident & Emergency / Casualty) but map
 * to DIFFERENT portal leaves with DIFFERENT allowed competence levels.
 * This generator only ever reads the Skin and Subcutaneous Tissue leaf
 * (via CASE_TYPE_LABEL) and only ever uses the levels configured in
 * specialty-config/skin-subcutaneous-tissue.json for this specialty, so
 * there is no risk of conflating the two.
 *
 * All generated cases are written to be Skin / Soft Tissue Surgical Unit
 * appropriate, with adult surgical-patient ages chosen per condition
 * (not a generic age spread).
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

const SPECIALTY_DIR = path.join(PROJECT_ROOT, 'generated-data', 'Skin-Subcutaneous-Tissue');
const DATE_RANGE_LABEL = '01-01-2026_to_30-06-2026';
const DATE_RANGE_DIR = path.join(SPECIALTY_DIR, DATE_RANGE_LABEL);
const GENERATED_DIR = path.join(DATE_RANGE_DIR, 'generated');
const REPORTS_DIR = path.join(DATE_RANGE_DIR, 'reports');
const CONFIG_PATH = path.join(SPECIALTY_DIR, 'specialty-config', 'skin-subcutaneous-tissue.json');

const DATASET_XLSX_PATH = path.join(GENERATED_DIR, 'BCPS_Logbook_Skin_Subcutaneous_Tissue_01-01-2026_to_30-06-2026.xlsx');

const FORM_LABEL = 'Procedural and Interpretative Skills';
const CASE_TYPE_LABEL = 'Skin and Subcutaneous Tissue';

const EXPECTED_INTERPRETATIVE_TOTAL = 6;
const EXPECTED_PROCEDURAL_TOTAL = 24;
const EXPECTED_GRAND_TOTAL = 30;

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
// Clinical content - concise, FCPS-logbook style, Skin / Soft Tissue
// Surgical Unit specific. Styled after the real BCPS Core Surgical
// Training logbook (style reference only - no real patient names, reg
// numbers, dates, ages, or patient-identifiable diagnoses were copied).
// Every diagnosis is deliberately matched to the exact skill/procedure
// and to a clinically plausible adult age (varied per condition, not a
// generic spread) per the surgical-unit and age-realism rules.
// ---------------------------------------------------------------------
const INTERPRETATIVE_SCENARIOS: Record<string, InterpScenario[]> = {
  'Histopathological analysis': [
    { diagnosis: 'Excised skin lesion, suspected basal cell carcinoma.', notes: 'Histopathology of the excised skin lesion confirms basal cell carcinoma with clear excision margins.', description: 'Histopathological analysis of excised skin lesion (suspected BCC).', targetAge: 62 },
    { diagnosis: 'Excised skin lesion, suspected squamous cell carcinoma.', notes: 'Histopathology of the excised skin lesion confirms a well-differentiated squamous cell carcinoma.', description: 'Histopathological analysis of excised skin lesion (suspected SCC).', targetAge: 58 },
    { diagnosis: 'Excised benign soft tissue mass (lipoma).', notes: 'Histopathology of the excision specimen confirms a benign lipoma with no atypical features.', description: 'Histopathological analysis of excised benign soft tissue mass.', targetAge: 41 },
  ],
  'Wound swab for C/S': [
    { diagnosis: 'Infected postoperative skin/soft tissue wound.', notes: 'Wound swab for culture and sensitivity grows Staphylococcus aureus, sensitive to cloxacillin.', description: 'Wound swab C/S for infected surgical wound.', targetAge: 50 },
    { diagnosis: 'Cellulitis of the leg with purulent discharge.', notes: 'Wound swab for culture and sensitivity grows Streptococcus pyogenes, sensitive to amoxicillin-clavulanate.', description: 'Wound swab C/S for cellulitis with purulent discharge.', targetAge: 55 },
    { diagnosis: 'Infected chronic skin ulcer of the foot.', notes: 'Wound swab for culture and sensitivity grows Pseudomonas aeruginosa, sensitive to ciprofloxacin.', description: 'Wound swab C/S for infected chronic skin ulcer.', targetAge: 63 },
  ],
};

const PROCEDURAL_SCENARIOS: Record<string, ProcScenario[]> = {
  'Drainage of superficial abscess': [
    { diagnosis: 'Gluteal superficial soft tissue abscess.', notes: 'Incision and drainage of the gluteal abscess performed under local anesthesia, cavity irrigated and packed.', description: 'Drainage of superficial gluteal abscess.', targetAge: 34, level: '3' },
    { diagnosis: 'Axillary superficial soft tissue abscess.', notes: 'Incision and drainage of the axillary abscess performed, wound left open for secondary healing.', description: 'Drainage of superficial axillary abscess.', targetAge: 29, level: '4' },
    { diagnosis: 'Superficial soft tissue abscess of the back.', notes: 'Incision and drainage of the superficial abscess of the back performed, pus sent for culture and sensitivity.', description: 'Drainage of superficial abscess of the back.', targetAge: 46, level: '3' },
  ],
  'Excision biopsy of SCC / BCC / Melanoma': [
    { diagnosis: 'Suspected basal cell carcinoma of the face.', notes: 'Excision biopsy of the facial lesion performed with adequate margins, specimen sent for histopathology.', description: 'Excision biopsy for suspected BCC of the face.', targetAge: 64, level: '2' },
    { diagnosis: 'Suspected squamous cell carcinoma of the limb.', notes: 'Wide excision biopsy of the limb lesion performed with primary closure, specimen sent for histopathology.', description: 'Excision biopsy for suspected SCC of the limb.', targetAge: 57, level: '3' },
    { diagnosis: 'Suspected melanoma of the trunk.', notes: 'Excision biopsy of the pigmented trunk lesion performed with a margin of normal surrounding skin, specimen sent for histopathology.', description: 'Excision biopsy for suspected melanoma of the trunk.', targetAge: 49, level: '2' },
  ],
  'Excision of carbuncle': [
    { diagnosis: 'Carbuncle of the back of the neck.', notes: 'Cruciate incision and excision of the carbuncle performed with de-roofing of loculi and wound packing.', description: 'Excision of carbuncle, back of the neck.', targetAge: 52, level: '3' },
  ],
  Fasciotomy: [
    { diagnosis: 'Necrotizing fasciitis of the lower limb.', notes: 'Emergency fasciotomy performed through a wide longitudinal incision with extensive debridement of necrotic fascia.', description: 'Fasciotomy for necrotizing fasciitis of the limb.', targetAge: 48, level: '4' },
  ],
  'Flap closure': [
    { diagnosis: 'Soft tissue defect following excision of a skin lesion of the scalp.', notes: 'Local rotation flap closure performed to cover the post-excision soft tissue defect.', description: 'Flap closure of post-excision skin defect.', targetAge: 45, level: '1' },
  ],
  'Lymph node biopsy': [
    { diagnosis: 'Persistent inguinal lymphadenopathy of skin/soft tissue origin.', notes: 'Excisional biopsy of an inguinal lymph node performed, specimen sent for histopathology.', description: 'Lymph node biopsy for inguinal lymphadenopathy.', targetAge: 38, level: '2' },
    { diagnosis: 'Persistent axillary lymphadenopathy of soft tissue origin.', notes: 'Excisional biopsy of an axillary lymph node performed under local anesthesia.', description: 'Lymph node biopsy for axillary lymphadenopathy.', targetAge: 44, level: '3' },
    { diagnosis: 'Persistent inguinal lymphadenopathy requiring tissue diagnosis.', notes: 'Excisional lymph node biopsy performed with careful hemostasis, specimen sent for histopathology.', description: 'Lymph node biopsy for persistent lymphadenopathy.', targetAge: 51, level: '2' },
  ],
  'Management of foreign bodies': [
    { diagnosis: 'Retained glass fragment in soft tissue of the foot.', notes: 'Foreign body exploration and removal of the retained glass fragment performed under local anesthesia.', description: 'Management of retained foreign body (glass fragment).', targetAge: 27, level: '2' },
    { diagnosis: 'Retained needle fragment in soft tissue of the hand.', notes: 'Foreign body localization and removal of the retained needle fragment performed under image guidance.', description: 'Management of retained foreign body (needle fragment).', targetAge: 33, level: '3' },
    { diagnosis: 'Retained wooden splinter in soft tissue of the forearm.', notes: 'Wound exploration and removal of the retained wooden foreign body performed with thorough wound toileting.', description: 'Management of retained foreign body (wooden splinter).', targetAge: 22, level: '2' },
  ],
  'Nail avulsion / Wedge resection': [
    { diagnosis: 'Ingrown toenail (onychocryptosis) of the great toe.', notes: 'Partial nail avulsion with wedge resection of the nail bed performed under digital block.', description: 'Nail avulsion / wedge resection for ingrown toenail.', targetAge: 24, level: '3' },
    { diagnosis: 'Recurrent ingrown toenail of the great toe.', notes: 'Total nail avulsion with phenolization of the nail matrix performed under digital block.', description: 'Nail avulsion for recurrent ingrown toenail.', targetAge: 19, level: '4' },
    { diagnosis: 'Ingrown toenail with associated paronychia.', notes: 'Wedge resection of the ingrown nail edge performed with drainage of the associated paronychia.', description: 'Wedge resection for ingrown toenail with paronychia.', targetAge: 31, level: '3' },
  ],
  'Skin grafting (partial thickness and full thickness)': [
    { diagnosis: 'Raw area following excision of a skin lesion of the leg.', notes: 'Split-thickness skin graft harvested from the thigh and applied to the raw area, secured with a tie-over dressing.', description: 'Skin grafting for post-excision raw area, leg.', targetAge: 40, level: '2' },
    { diagnosis: 'Soft tissue defect following excision of a skin lesion of the forearm.', notes: 'Full-thickness skin graft harvested and applied to the defect, meticulous edge-to-edge suturing performed.', description: 'Skin grafting for post-excision defect, forearm.', targetAge: 36, level: '3' },
    { diagnosis: 'Raw area following excision of a soft tissue lesion of the scalp.', notes: 'Split-thickness skin graft applied to the scalp defect, secured with a bolster dressing.', description: 'Skin grafting for post-excision raw area, scalp.', targetAge: 54, level: '2' },
  ],
  'Wound debridement': [
    { diagnosis: 'Infected necrotic soft tissue wound of the leg.', notes: 'Surgical debridement of the necrotic wound performed, all non-viable tissue excised.', description: 'Wound debridement for infected necrotic wound.', targetAge: 59, level: '3' },
    { diagnosis: 'Chronic non-healing skin ulcer of the foot requiring debridement.', notes: 'Sharp debridement of the chronic ulcer bed performed with removal of slough and fibrous tissue.', description: 'Wound debridement for chronic non-healing skin ulcer.', targetAge: 66, level: '4' },
    { diagnosis: 'Infected diabetic foot wound requiring debridement.', notes: 'Surgical debridement of the infected diabetic foot wound performed, wound left open for delayed closure.', description: 'Wound debridement for infected diabetic foot wound.', targetAge: 61, level: '3' },
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

// Skin and Subcutaneous Tissue conditions affect both genders without a
// strong skew (abscess, carbuncle, foreign bodies, ingrown toenail, skin
// malignancy, wound debridement/grafting all occur in men and women) - a
// modest male-leaning pool (2:1) is used, consistent with the general
// adult surgical-unit name pools used elsewhere in this project (e.g.
// Orthopaedic Surgery), while keeping female names well represented.
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
// user explicitly permits "multiple cases may occur on the same day
// where plausible") - only patient identity fields (name/regNo/
// ExternalRowId) must stay unique, not the date itself.
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
  // which computes the target age correctly but violates "DOB must be
  // strictly before Assignment Date." Nudge back one day rather than
  // reject - this keeps the completed age unchanged in every practical
  // case (including across a year boundary).
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
    const dates = buildAssignmentDates(skill.count, 21000 + globalIndex);
    for (let i = 0; i < skill.count; i++) {
      const scenario = bank[i];
      const { dob, age } = resolveDobAge(dates[i], scenario.targetAge, 31000 + globalIndex);
      rows.push({
        externalRowId: `SST-${(globalIndex + 1).toString().padStart(3, '0')}`,
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
    const dates = buildAssignmentDates(skill.count, 22000 + globalIndex);
    for (let i = 0; i < skill.count; i++) {
      const scenario = bank[i];
      const { dob, age } = resolveDobAge(dates[i], scenario.targetAge, 32000 + globalIndex);
      rows.push({
        externalRowId: `SST-${(globalIndex + 1).toString().padStart(3, '0')}`,
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
  logger.info('Generating Skin and Subcutaneous Tissue dataset (USER-PROVIDED EXACT COUNTS, dry-run only).');

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
  logger.info(`All 12 configured skills matched exactly to the mapped portal data (${labelDifferences.length} label difference(s) found), and all requested competence levels are portal-valid.`);

  const interpPlanned = config.skills['Interpretative Skill'].reduce((s, sk) => s + sk.count, 0);
  const procPlanned = config.skills['Procedural skill'].reduce((s, sk) => s + sk.count, 0);
  const totalRowsPlanned = interpPlanned + procPlanned;
  if (interpPlanned !== EXPECTED_INTERPRETATIVE_TOTAL || procPlanned !== EXPECTED_PROCEDURAL_TOTAL || totalRowsPlanned !== EXPECTED_GRAND_TOTAL) {
    logger.error(
      `Config totals (Interpretative=${interpPlanned}, Procedural=${procPlanned}, Grand=${totalRowsPlanned}) do not match the resolved exact totals (${EXPECTED_INTERPRETATIVE_TOTAL}/${EXPECTED_PROCEDURAL_TOTAL}/${EXPECTED_GRAND_TOTAL}). STOP.`
    );
    process.exit(1);
  }
  logger.info(`Total rows planned (USER-PROVIDED EXACT COUNTS, itemized breakdown - no arithmetic discrepancy for this specialty): ${totalRowsPlanned} (Interpretative=${interpPlanned}, Procedural=${procPlanned})`);

  const namePool = buildUniqueNamePool(totalRowsPlanned, 18811);
  const regNoPool = buildUniqueRegNos(totalRowsPlanned, 19922);

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
  logger.info('DOB/Age verification passed for all rows (DOB before Assignment Date, exact completed age, adult-surgical-unit appropriate).');

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
    JSON.stringify({ generatedAt: new Date().toISOString(), totalSkillsRequested: 12, totalSkillsMatched: 12, unmatchedSkills: unmatched, labelDifferences, levelMismatches }, null, 2),
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
    specialty: 'Skin and Subcutaneous Tissue',
    trainingContext: 'Skin / Soft Tissue Surgical Unit',
    dateRange: { label: DATE_RANGE_LABEL, from: '2026-01-01', to: '2026-06-30' },
    datasetWorkbook: DATASET_XLSX_PATH,
    quotaDecision: {
      countSource: 'USER_PROVIDED_EXACT_COUNTS',
      portalQuotaUsedToSizeDataset: false,
      reason: "Per explicit user instruction, this dataset uses the exact per-skill counts and competence levels the user supplied, NOT portal quota minimums. The itemized counts sum exactly to the stated totals (6 Interpretative + 24 Procedural = 30) with no arithmetic discrepancy for this specialty. The portal's own mapped minimums were NOT used to size this dataset - recorded in specialty-config/skin-subcutaneous-tissue.json for traceability only.",
    },
    competenceLevelHandling: 'For every Procedural skill with more than one allowed competence level, individual rows use varying portal-valid levels (never multiplying row count) - see procedural_competenceLevelUsage in row-count-summary.json for the exact levels used per skill.',
    duplicateLabelHandling: "\"Fasciotomy\" and \"Wound debridement\" are also used as Procedural skill names in other specialties (Plastic Surgery and Accident & Emergency / Casualty respectively) with DIFFERENT allowed competence levels there. This generator only reads the Skin and Subcutaneous Tissue leaf (via CASE_TYPE_LABEL) and only uses the levels configured in specialty-config/skin-subcutaneous-tissue.json (levels 3,4 for both here), so the two same-named skills are never conflated.",
    ageRealism: 'Every row uses a clinically plausible adult age chosen per condition rather than a generic spread - e.g. younger adult ages for ingrown toenail/foreign bodies, middle-aged/older adult ages for skin malignancy excision, carbuncle, and chronic wound debridement.',
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
  logger.error(`generate-skin-subcutaneous-tissue-dataset crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
