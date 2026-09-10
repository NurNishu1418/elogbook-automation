/**
 * Synthetic test-dataset generator for Disorders of the Breast (Interpretative
 * Skill + Procedural skill), using the PORTAL-AUTHORITATIVE quota exclusively
 * (84 rows total: 47 Interpretative + 37 Procedural). The document/PDF skill
 * list was used only to help identify expected skill names; every count
 * comes from the live portal's own mapped data and server-computed
 * total_min_target, per explicit user instruction. The PDF was consulted
 * only for Diagnosis/Problems STYLE (no real patient data copied).
 *
 * Does NOT modify src/mapper, src/excel, or any existing file under
 * src/uploader - only imports and reuses existing exported functions
 * (readDataEntryRows, validateRow) against a brand-new workbook, copied
 * structurally from the real output/BCPS_Logbook_Full_Mapping.xlsx (never
 * modified). Dry-run only - no login, no browser, no draft created.
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

const SPECIALTY_DIR = path.join(PROJECT_ROOT, 'generated-data', 'Disorders-of-the-Breast');
const DATE_RANGE_LABEL = '01-01-2026_to_30-06-2026';
const DATE_RANGE_DIR = path.join(SPECIALTY_DIR, DATE_RANGE_LABEL);
const GENERATED_DIR = path.join(DATE_RANGE_DIR, 'generated');
const REPORTS_DIR = path.join(DATE_RANGE_DIR, 'reports');
const CONFIG_PATH = path.join(SPECIALTY_DIR, 'specialty-config', 'disorders-of-the-breast.json');

const DATASET_XLSX_PATH = path.join(GENERATED_DIR, 'BCPS_Logbook_Disorders_of_the_Breast_01-01-2026_to_30-06-2026.xlsx');

const FORM_LABEL = 'Procedural and Interpretative Skills';
const CASE_TYPE_LABEL = 'Disorders of the Breast';

interface Scenario {
  diagnosis: string;
  notes: string;
  description: string;
}

// ---------------------------------------------------------------------
// Clinical content - concise, FCPS-logbook style, breast-specific. Styled
// after the real BCPS Core Surgical Training logbook (reviewed for STYLE
// ONLY across a bounded, non-exhaustive sample - no real patient names,
// reg numbers, dates, ages, or patient-identifiable diagnoses were copied).
// ---------------------------------------------------------------------
const INTERPRETATIVE_SCENARIOS: Record<string, Scenario[]> = {
  'Cytological analysis of nipple discharge': [
    { diagnosis: 'Bloody nipple discharge.', notes: 'Cytology shows atypical ductal cells.', description: 'Cytological analysis of nipple discharge.' },
    { diagnosis: 'Serous nipple discharge.', notes: 'Cytology shows benign ductal epithelial cells.', description: 'Cytological analysis of nipple discharge.' },
  ],
  'FNAC of breast lump': [
    { diagnosis: 'Breast lump.', notes: 'FNAC shows benign fibroadenoma pattern.', description: 'FNAC of breast lump.' },
    { diagnosis: 'Suspicious breast lump.', notes: 'FNAC suggestive of malignancy.', description: 'FNAC of suspicious breast lump.' },
    { diagnosis: 'Palpable breast lump, benign on examination.', notes: 'FNAC shows fibrocystic changes.', description: 'FNAC for fibrocystic breast lump.' },
    { diagnosis: 'Axillary lymphadenopathy with breast lump.', notes: 'FNAC of node shows metastatic deposits.', description: 'FNAC of axillary node.' },
    { diagnosis: 'Recurrent breast lump.', notes: 'FNAC shows benign epithelial cells.', description: 'FNAC of recurrent breast lump.' },
  ],
  'Histopathological report analysis': [
    { diagnosis: 'Carcinoma breast, post-excision specimen.', notes: 'Histopathology confirms invasive ductal carcinoma.', description: 'Histopathology analysis for carcinoma breast.' },
    { diagnosis: 'Fibroadenoma, excised specimen.', notes: 'Histopathology confirms benign fibroadenoma.', description: 'Histopathology analysis for fibroadenoma.' },
    { diagnosis: 'Core-cut biopsy specimen analysis.', notes: 'Histopathology shows ductal carcinoma in situ.', description: 'Histopathology analysis of core biopsy.' },
    { diagnosis: 'Mastectomy specimen analysis.', notes: 'Histopathology confirms clear resection margins.', description: 'Histopathology analysis of mastectomy specimen.' },
    { diagnosis: 'Sentinel node specimen analysis.', notes: 'Histopathology shows no metastatic involvement.', description: 'Histopathology analysis of sentinel node.' },
  ],
  'Hormone study': [
    { diagnosis: 'Carcinoma breast, hormone receptor work-up.', notes: 'ER positive, PR positive.', description: 'Hormone study for carcinoma breast.' },
    { diagnosis: 'Early breast carcinoma, receptor status.', notes: 'ER positive, PR negative.', description: 'Hormone study, pre-treatment.' },
    { diagnosis: 'Locally advanced breast carcinoma.', notes: 'ER negative, PR negative, triple negative profile.', description: 'Hormone study for locally advanced carcinoma.' },
    { diagnosis: 'Post-operative breast carcinoma follow-up.', notes: 'ER strongly positive.', description: 'Hormone study follow-up.' },
    { diagnosis: 'Carcinoma breast, neoadjuvant planning.', notes: 'ER positive, HER2 negative.', description: 'Hormone study for treatment planning.' },
    { diagnosis: 'Metastatic breast carcinoma.', notes: 'ER negative, PR positive.', description: 'Hormone study in metastatic disease.' },
    { diagnosis: 'Recurrent breast carcinoma.', notes: 'ER status reassessed, now negative.', description: 'Repeat hormone study.' },
    { diagnosis: 'Carcinoma breast, endocrine therapy planning.', notes: 'ER and PR both strongly positive.', description: 'Hormone study for endocrine therapy.' },
    { diagnosis: 'Bilateral breast carcinoma work-up.', notes: 'ER positive in both specimens.', description: 'Hormone study, bilateral disease.' },
    { diagnosis: 'Male breast carcinoma, hormone work-up.', notes: 'ER positive, consistent with male breast cancer profile.', description: 'Hormone study for male breast carcinoma.' },
  ],
  Immunohistochemistry: [
    { diagnosis: 'Carcinoma breast, HER2 status requested.', notes: 'HER2 positive (3+).', description: 'IHC for HER2 status.' },
    { diagnosis: 'Invasive ductal carcinoma, IHC panel.', notes: 'Ki-67 index 25%, high proliferation.', description: 'IHC for Ki-67 proliferation index.' },
    { diagnosis: 'Carcinoma breast, equivocal HER2 on IHC.', notes: 'HER2 2+, reflex FISH advised.', description: 'IHC for HER2, equivocal result.' },
    { diagnosis: 'Triple negative breast carcinoma work-up.', notes: 'ER, PR, HER2 all negative on IHC.', description: 'IHC panel for triple negative status.' },
    { diagnosis: 'Metastatic axillary node, IHC confirmation.', notes: 'GATA3 positive, confirming breast origin.', description: 'IHC for metastatic node origin.' },
  ],
  'MRI / CT scan / Bone scan in locally advanced or metastatic breast cancer': [
    { diagnosis: 'Locally advanced breast carcinoma, staging.', notes: 'MRI shows chest wall involvement.', description: 'MRI for staging locally advanced carcinoma.' },
    { diagnosis: 'Metastatic breast carcinoma, bone pain.', notes: 'Bone scan shows multiple skeletal metastases.', description: 'Bone scan for metastatic work-up.' },
    { diagnosis: 'Breast carcinoma, distant metastasis screening.', notes: 'CT chest/abdomen shows liver metastases.', description: 'CT scan for metastatic screening.' },
    { diagnosis: 'Locally advanced breast carcinoma, MRI staging.', notes: 'MRI shows multicentric disease.', description: 'MRI for multicentric disease assessment.' },
    { diagnosis: 'Breast carcinoma with back pain.', notes: 'Bone scan shows vertebral metastasis.', description: 'Bone scan for suspected spinal metastasis.' },
  ],
  'Mammogram/tomosynthesis': [
    { diagnosis: 'Screening-detected breast lesion.', notes: 'Mammogram shows spiculated mass, BI-RADS 4.', description: 'Mammogram for screening-detected lesion.' },
    { diagnosis: 'Palpable breast lump.', notes: 'Mammogram shows well-defined mass, BI-RADS 3.', description: 'Mammogram for palpable lump.' },
    { diagnosis: 'Suspicious mammographic lesion.', notes: 'Tomosynthesis shows architectural distortion.', description: 'Tomosynthesis for suspicious lesion.' },
    { diagnosis: 'Dense breast, screening mammogram.', notes: 'Mammogram shows dense parenchyma, no discrete mass.', description: 'Screening mammogram, dense breast.' },
    { diagnosis: 'Microcalcifications on screening.', notes: 'Mammogram shows clustered microcalcifications, BI-RADS 4.', description: 'Mammogram for microcalcifications.' },
  ],
  'Receptor study': [
    { diagnosis: 'Carcinoma breast, receptor profiling.', notes: 'ER/PR/HER2 receptor panel completed.', description: 'Receptor study for carcinoma breast.' },
    { diagnosis: 'Early breast carcinoma, pre-treatment receptor study.', notes: 'Luminal A profile identified.', description: 'Receptor study, luminal subtype.' },
    { diagnosis: 'Locally advanced breast carcinoma.', notes: 'Luminal B profile with high Ki-67.', description: 'Receptor study for locally advanced carcinoma.' },
    { diagnosis: 'Recurrent breast carcinoma, repeat receptor study.', notes: 'Receptor status changed from positive to negative.', description: 'Repeat receptor study.' },
    { diagnosis: 'Metastatic breast carcinoma, receptor reassessment.', notes: 'HER2-enriched profile identified.', description: 'Receptor study in metastatic setting.' },
  ],
  'USG of breasts': [
    { diagnosis: 'Breast lump, sonographic assessment.', notes: 'USG shows well-defined hypoechoic mass, likely fibroadenoma.', description: 'USG of breast for lump.' },
    { diagnosis: 'Breast abscess, sonographic assessment.', notes: 'USG shows collection with internal debris.', description: 'USG of breast for abscess.' },
    { diagnosis: 'Suspicious breast lump.', notes: 'USG shows irregular hypoechoic mass with microlobulation.', description: 'USG of breast for suspicious lump.' },
    { diagnosis: 'Nipple discharge, sonographic assessment.', notes: 'USG shows dilated duct with intraductal lesion.', description: 'USG for nipple discharge work-up.' },
    { diagnosis: 'Axillary lymphadenopathy assessment.', notes: 'USG shows enlarged axillary nodes with loss of fatty hilum.', description: 'USG of axilla.' },
  ],
};

const PROCEDURAL_SCENARIOS: Record<string, Scenario[]> = {
  'Aspiration of breast abscess': [
    { diagnosis: 'Breast abscess.', notes: 'Needle aspiration of breast abscess done under local anesthesia.', description: 'Aspiration of breast abscess.' },
    { diagnosis: 'Lactational breast abscess.', notes: 'USG-guided aspiration of lactational abscess performed.', description: 'Aspiration of lactational abscess.' },
    { diagnosis: 'Small breast abscess.', notes: 'Aspiration done, purulent material sent for culture.', description: 'Aspiration of breast abscess.' },
    { diagnosis: 'Recurrent breast abscess.', notes: 'Repeat aspiration performed for recurrent collection.', description: 'Aspiration of recurrent breast abscess.' },
    { diagnosis: 'Early breast abscess.', notes: 'Needle aspiration done, avoiding formal incision.', description: 'Aspiration of early breast abscess.' },
  ],
  'Breast conserving surgery': [
    { diagnosis: 'Early breast carcinoma.', notes: 'Breast conserving surgery done with wide local excision and margin assessment.', description: 'BCS for early breast carcinoma.' },
    { diagnosis: 'Localized carcinoma breast.', notes: 'Breast conserving surgery performed with oncoplastic closure.', description: 'BCS for localized carcinoma.' },
  ],
  'Breast reconstruction': [
    { diagnosis: 'Post-mastectomy breast defect.', notes: 'Breast reconstruction performed using latissimus dorsi flap.', description: 'Breast reconstruction post-mastectomy.' },
    { diagnosis: 'Post-mastectomy deformity.', notes: 'Implant-based breast reconstruction performed.', description: 'Implant-based breast reconstruction.' },
  ],
  'Core-cut biopsy': [
    { diagnosis: 'Suspicious breast lump.', notes: 'Core-cut biopsy done under USG guidance, tissue sent for histopathology.', description: 'Core-cut biopsy of breast lump.' },
    { diagnosis: 'Suspected carcinoma breast.', notes: 'Core-cut biopsy performed with adequate tissue sampling.', description: 'Core-cut biopsy for suspected carcinoma.' },
  ],
  'Drainage of breast abscess': [
    { diagnosis: 'Breast abscess.', notes: 'Incision and drainage of breast abscess done, loculi broken.', description: 'Drainage of breast abscess.' },
    { diagnosis: 'Lactational breast abscess.', notes: 'Drainage performed with counter-incision for adequate outflow.', description: 'Drainage of lactational abscess.' },
    { diagnosis: 'Large breast abscess.', notes: 'Wide drainage done with corrugated drain placement.', description: 'Drainage of large breast abscess.' },
    { diagnosis: 'Recurrent breast abscess.', notes: 'Re-drainage done, cavity irrigated with saline.', description: 'Drainage of recurrent breast abscess.' },
    { diagnosis: 'Peri-areolar abscess.', notes: 'Drainage performed with peri-areolar incision, nipple preserved.', description: 'Drainage of peri-areolar abscess.' },
  ],
  'Enucleation/excision of fibroadenoma': [
    { diagnosis: 'Fibroadenoma of breast.', notes: 'Enucleation of fibroadenoma done through peri-areolar incision.', description: 'Excision of fibroadenoma.' },
    { diagnosis: 'Symptomatic fibroadenoma.', notes: 'Fibroadenoma excised in toto with capsule intact.', description: 'Excision of symptomatic fibroadenoma.' },
  ],
  'FNAC of a breast lump': [
    { diagnosis: 'Breast lump.', notes: 'FNAC performed under aseptic technique, smears prepared.', description: 'FNAC of breast lump.' },
    { diagnosis: 'Suspicious breast lump.', notes: 'FNAC done with multiple passes for adequate cellularity.', description: 'FNAC of suspicious lump.' },
    { diagnosis: 'Palpable breast lump.', notes: 'FNAC performed, aspirate sent for cytology.', description: 'FNAC of palpable breast lump.' },
    { diagnosis: 'Recurrent breast lump.', notes: 'Repeat FNAC done for recurrent swelling.', description: 'FNAC of recurrent breast lump.' },
    { diagnosis: 'Axillary lump with breast mass.', notes: 'FNAC of both breast and axillary lump performed.', description: 'FNAC of breast and axillary lump.' },
  ],
  'Image guided biopsy / Wire guided biopsy / hydromarker': [
    { diagnosis: 'Non-palpable suspicious breast lesion.', notes: 'USG-guided core biopsy performed with hydromarker placement.', description: 'Image-guided biopsy of non-palpable lesion.' },
    { diagnosis: 'Suspicious mammographic lesion.', notes: 'Wire-guided localization biopsy performed pre-operatively.', description: 'Wire-guided biopsy for mammographic lesion.' },
  ],
  'Incision biopsy': [
    { diagnosis: 'Locally advanced breast carcinoma.', notes: 'Incision biopsy performed for tissue diagnosis prior to neoadjuvant therapy.', description: 'Incision biopsy of breast mass.' },
    { diagnosis: 'Large fungating breast mass.', notes: 'Incision biopsy done under local anesthesia.', description: 'Incision biopsy of fungating mass.' },
  ],
  'Mastectomy of male breast': [
    { diagnosis: 'Male breast carcinoma.', notes: 'Mastectomy of male breast performed with axillary staging.', description: 'Mastectomy for male breast carcinoma.' },
    { diagnosis: 'Gynecomastia, symptomatic.', notes: 'Subcutaneous mastectomy performed for gynecomastia.', description: 'Mastectomy for gynecomastia.' },
  ],
  'Nipple reconstruction': [
    { diagnosis: 'Post-mastectomy nipple-areolar defect.', notes: 'Nipple reconstruction performed using local skin flap technique.', description: 'Nipple reconstruction post-mastectomy.' },
    { diagnosis: 'Post-reconstruction nipple defect.', notes: 'Nipple-areolar complex reconstruction done with tattooing planned.', description: 'Nipple reconstruction post-flap surgery.' },
  ],
  'Sentinel lymphnode biopsy': [
    { diagnosis: 'Early breast carcinoma, clinically node-negative.', notes: 'Sentinel lymph node biopsy performed using dye technique.', description: 'Sentinel node biopsy for early carcinoma.' },
    { diagnosis: 'Clinically node-negative breast carcinoma.', notes: 'Sentinel node biopsy done, frozen section sent.', description: 'Sentinel node biopsy, intraoperative assessment.' },
  ],
  'Simple mastectomy with or without axillary dissection': [
    { diagnosis: 'Operable breast carcinoma.', notes: 'Simple mastectomy with axillary dissection performed.', description: 'Simple mastectomy with axillary clearance.' },
    { diagnosis: 'Carcinoma breast, elderly patient.', notes: 'Simple mastectomy performed without axillary dissection.', description: 'Simple mastectomy alone.' },
  ],
  'Wide excision / lumpectomy': [
    { diagnosis: 'Fibroadenoma, large size.', notes: 'Wide excision performed with clear margins.', description: 'Wide excision of breast lesion.' },
    { diagnosis: 'Localized breast lesion.', notes: 'Lumpectomy performed with margin assessment.', description: 'Lumpectomy for localized lesion.' },
  ],
};

const MALE_FIRST = [
  'Md. Kamal', 'Abdul', 'Mohammad Arif', 'Md. Zahirul', 'Tanvir', 'Md. Nurul', 'Shahidul', 'Md. Rafiqul',
  'Golam', 'Md. Aminul', 'Habibur', 'Md. Shafiqul', 'Anisur', 'Md. Jahangir', 'Rezaul', 'Md. Mahbubur',
];
const FEMALE_FIRST = [
  'Rahima', 'Nasrin', 'Farzana', 'Salma', 'Sharmin', 'Rokeya', 'Shirin', 'Nasima', 'Marufa', 'Taslima',
  'Rehana', 'Shahnaz', 'Fatema', 'Rubina', 'Momena', 'Shahana', 'Rashida', 'Parveen', 'Halima', 'Aleya',
  'Kohinoor', 'Mahmuda', 'Ferdousi', 'Jesmin', 'Nurjahan', 'Selina', 'Rowshan', 'Dilruba',
];
const SURNAMES = [
  'Hossain', 'Begum', 'Karim', 'Akter', 'Hasan', 'Yasmin', 'Islam', 'Khatun', 'Ahmed', 'Sultana',
  'Rahman', 'Chowdhury', 'Alam', 'Miah', 'Uddin', 'Khan', 'Talukder', 'Sarkar', 'Molla', 'Bhuiyan',
];

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

function buildUniqueNamePool(count: number, seed: number): string[] {
  const names = new Set<string>();
  // Breast disorders skew heavily female in real practice, but male breast
  // carcinoma/gynecomastia are genuine skills in this dataset - weight the
  // pool female-majority while keeping some male names available.
  const firsts = shuffle([...FEMALE_FIRST, ...FEMALE_FIRST, ...MALE_FIRST], seed);
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
  const dobStr = dob.toISOString().slice(0, 10);
  const verifiedAge = calculateAge(dobStr, assignmentDate);
  return { dob: dobStr, verifiedAge };
}

function calculateAge(dobStr: string, assignmentDateStr: string): number {
  const dob = new Date(dobStr + 'T00:00:00Z');
  const assign = new Date(assignmentDateStr + 'T00:00:00Z');
  let age = assign.getUTCFullYear() - dob.getUTCFullYear();
  const hadBirthday = assign.getUTCMonth() > dob.getUTCMonth() || (assign.getUTCMonth() === dob.getUTCMonth() && assign.getUTCDate() >= dob.getUTCDate());
  if (!hadBirthday) age--;
  return age;
}

interface SkillLevelCount {
  level: string | null;
  count: number;
}
interface SkillDef {
  name: string;
  levels: SkillLevelCount[];
}
interface Config {
  skills: { 'Interpretative Skill': SkillDef[]; 'Procedural skill': SkillDef[] };
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

function generateRows(config: Config, namePool: string[], regNoPool: string[]): GeneratedRow[] {
  const rows: GeneratedRow[] = [];
  let globalIndex = 0;

  const process = (skillType: 'Interpretative Skill' | 'Procedural skill', scenarios: Record<string, Scenario[]>) => {
    for (const skill of config.skills[skillType]) {
      const bank = scenarios[skill.name];
      if (!bank) throw new Error(`No clinical content scenarios authored for "${skill.name}" (${skillType}). Refusing to fabricate generic content.`);
      let scenarioCursor = 0;
      for (const levelDef of skill.levels) {
        const dates = buildAssignmentDates(levelDef.count, 3000 + globalIndex);
        for (let i = 0; i < levelDef.count; i++) {
          if (scenarioCursor >= bank.length) throw new Error(`Not enough authored scenarios for "${skill.name}" - need ${skill.levels.reduce((s, l) => s + l.count, 0)}, have ${bank.length}.`);
          const scenario = bank[scenarioCursor];
          scenarioCursor++;
          const targetAge = 20 + Math.floor(((85 - 20) * ((globalIndex % 19) / 19)));
          const { dob, verifiedAge } = computeVerifiedDob(dates[i], targetAge, 9000 + globalIndex);
          let finalDob = dob;
          let finalAge = verifiedAge;
          if (verifiedAge !== targetAge) {
            let fixed = computeVerifiedDob(dates[i], targetAge, 10000 + globalIndex);
            let attempts = 0;
            while (fixed.verifiedAge !== targetAge && attempts < 20) {
              fixed = computeVerifiedDob(dates[i], targetAge, 11000 + globalIndex + attempts);
              attempts++;
            }
            if (fixed.verifiedAge !== targetAge) {
              throw new Error(`Could not generate a matching DOB/Age pair for row ${globalIndex} (target age ${targetAge}, date ${dates[i]}).`);
            }
            finalDob = fixed.dob;
            finalAge = fixed.verifiedAge;
          }

          rows.push({
            externalRowId: `DOB-${(globalIndex + 1).toString().padStart(3, '0')}`,
            skillType,
            competencyItem: skill.name,
            competenceLevel: levelDef.level,
            patientName: namePool[globalIndex],
            patientRegNo: regNoPool[globalIndex],
            dateOfAssignment: dates[i],
            dateOfBirth: finalDob,
            age: finalAge,
            diagnosis: scenario.diagnosis,
            notes: scenario.notes,
            description: scenario.description,
          });
          globalIndex++;
        }
      }
    }
  };

  process('Interpretative Skill', INTERPRETATIVE_SCENARIOS);
  process('Procedural skill', PROCEDURAL_SCENARIOS);

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

async function main() {
  logger.info('Generating Disorders of the Breast dataset (PORTAL-AUTHORITATIVE quota, dry-run only).');

  const realWorkbookStatBefore = fs.statSync(REAL_XLSX_PATH);
  const basicSurgicalDir = path.join(PROJECT_ROOT, 'generated-data', 'Basic-Surgical-Skill');
  const basicSurgicalFilesBefore = fs.readdirSync(basicSurgicalDir).sort();
  const giDir = path.join(PROJECT_ROOT, 'generated-data', 'Gastrointestinal-HepatoBiliary-Pancreas');
  const giFilesBefore = JSON.stringify(walkDir(giDir));

  const config = loadConfig();
  const formMap = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'form-map.json'), 'utf-8'));
  const leaves: LeafForValidation[] = formMap.leaves.map((l: any) => ({
    leafId: l.leafId,
    pathLabels: l.pathLabels,
    fields: l.fields ?? [],
    competencyGroup: l.competencyGroup ?? [],
  }));

  const unmatched: { skillType: string; name: string }[] = [];
  for (const skillType of ['Interpretative Skill', 'Procedural skill'] as const) {
    const leaf = leaves.find((l) => l.pathLabels.join(' > ') === `${FORM_LABEL} > ${CASE_TYPE_LABEL} > ${skillType}`);
    for (const skill of config.skills[skillType]) {
      const exists = leaf?.competencyGroup.some((c) => c.particulars.trim() === skill.name.trim());
      if (!exists) unmatched.push({ skillType, name: skill.name });
    }
  }
  if (unmatched.length > 0) {
    logger.error(`Unmatched skills - refusing to guess: ${JSON.stringify(unmatched)}`);
    process.exit(1);
  }
  logger.info('All 23 configured skills matched exactly to the mapped portal data.');

  const totalRowsPlanned =
    config.skills['Interpretative Skill'].reduce((s, sk) => s + sk.levels.reduce((a, l) => a + l.count, 0), 0) +
    config.skills['Procedural skill'].reduce((s, sk) => s + sk.levels.reduce((a, l) => a + l.count, 0), 0);
  logger.info(`Total rows planned (portal-authoritative quota): ${totalRowsPlanned}`);

  const namePool = buildUniqueNamePool(totalRowsPlanned, 5151);
  const regNoPool = buildUniqueRegNos(totalRowsPlanned, 6262);
  if (namePool.length < totalRowsPlanned) throw new Error(`Name pool only produced ${namePool.length} unique names, need ${totalRowsPlanned}.`);

  const rows = generateRows(config, namePool, regNoPool);
  logger.info(`Generated ${rows.length} rows.`);

  const ageErrors: string[] = [];
  for (const r of rows) {
    const recomputed = calculateAge(r.dateOfBirth, r.dateOfAssignment);
    if (recomputed !== r.age) ageErrors.push(`${r.externalRowId}: DOB=${r.dateOfBirth}, AssignDate=${r.dateOfAssignment}, stored=${r.age}, recomputed=${recomputed}`);
  }
  if (ageErrors.length > 0) {
    logger.error(`DOB/Age verification FAILED for ${ageErrors.length} row(s):`);
    ageErrors.forEach((e) => logger.error(`  ${e}`));
    process.exit(1);
  }
  logger.info('DOB/Age verification passed for all rows.');

  const nameSet = new Set(rows.map((r) => r.patientName));
  const regNoSet = new Set(rows.map((r) => r.patientRegNo));
  const rowIdSet = new Set(rows.map((r) => r.externalRowId));
  if (nameSet.size !== rows.length) throw new Error(`Duplicate patient names detected: ${rows.length - nameSet.size} collision(s).`);
  if (regNoSet.size !== rows.length) throw new Error(`Duplicate registration numbers detected: ${rows.length - regNoSet.size} collision(s).`);
  if (rowIdSet.size !== rows.length) throw new Error(`Duplicate ExternalRowIds detected: ${rows.length - rowIdSet.size} collision(s).`);
  for (const r of rows) {
    const d = new Date(r.dateOfAssignment + 'T00:00:00Z');
    if (d < new Date('2026-01-01T00:00:00Z') || d > new Date('2026-06-30T00:00:00Z')) throw new Error(`Row ${r.externalRowId} has an out-of-range assignment date: ${r.dateOfAssignment}`);
  }
  logger.info('Uniqueness (names, reg numbers, ExternalRowIds) and date-range verification passed for all rows.');

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
  for (const skillType of ['Interpretative Skill', 'Procedural skill'] as const) {
    for (const skill of config.skills[skillType]) {
      const requested = skill.levels.reduce((s, l) => s + l.count, 0);
      const actual = rows.filter((r) => r.skillType === skillType && r.competencyItem === skill.name).length;
      perSkillCounts[`${skillType} > ${skill.name}`] = { requested, actual };
    }
  }
  const perLevelCounts: { skillType: string; skill: string; level: string | null; requested: number; actual: number }[] = [];
  for (const skill of config.skills['Procedural skill']) {
    for (const levelDef of skill.levels) {
      const actual = rows.filter((r) => r.skillType === 'Procedural skill' && r.competencyItem === skill.name && r.competenceLevel === levelDef.level).length;
      perLevelCounts.push({ skillType: 'Procedural skill', skill: skill.name, level: levelDef.level, requested: levelDef.count, actual });
    }
  }

  const interpTotal = rows.filter((r) => r.skillType === 'Interpretative Skill').length;
  const procTotal = rows.filter((r) => r.skillType === 'Procedural skill').length;

  fs.writeFileSync(
    path.join(REPORTS_DIR, 'row-count-summary.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), totalRows: rows.length, interpretativeTotal: interpTotal, proceduralTotal: procTotal, perSkill: perSkillCounts, perCompetenceLevel: perLevelCounts }, null, 2),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(REPORTS_DIR, 'portal-quota-report.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        decision: 'PORTAL_AUTHORITATIVE_ONLY - document/PDF counts were never used',
        portalAuthoritativeTotal: { interpretative: 47, procedural: 37, grandTotal: 84 },
        usedForGeneration: { interpretative: interpTotal, procedural: procTotal, grandTotal: rows.length },
        verificationMethod: "Portal's own server-computed total_min_target field from GET /api/auth/elogbook-management/v1/logbook-entry-report-by-from/{formId} (read-only, 2026-09-09). Case-type total_min_target=84, Interpretative Skill=47, Procedural skill=37 - matches the sum of every individual competence-level min_value exactly.",
        note: 'The document/PDF skill list was used only to help identify expected skill names for cross-checking against the mapped portal data - it was never used to determine any row count.',
      },
      null,
      2
    ),
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
    JSON.stringify({ generatedAt: new Date().toISOString(), totalSkillsRequested: 23, totalSkillsMatched: 23, unmatchedSkills: unmatched }, null, 2),
    'utf-8'
  );

  const realWorkbookStatAfter = fs.statSync(REAL_XLSX_PATH);
  const originalWorkbookUnchanged = realWorkbookStatBefore.size === realWorkbookStatAfter.size && realWorkbookStatBefore.mtimeMs === realWorkbookStatAfter.mtimeMs;
  const basicSurgicalFilesAfter = fs.readdirSync(basicSurgicalDir).sort();
  const basicSurgicalUnchanged = JSON.stringify(basicSurgicalFilesBefore) === JSON.stringify(basicSurgicalFilesAfter);
  const giFilesAfter = JSON.stringify(walkDir(giDir));
  const giUnchanged = giFilesBefore === giFilesAfter;

  const generationSummary = {
    generatedAt: new Date().toISOString(),
    specialty: 'Disorders of the Breast',
    dateRange: { label: DATE_RANGE_LABEL, from: '2026-01-01', to: '2026-06-30' },
    datasetWorkbook: DATASET_XLSX_PATH,
    quotaDecision: {
      documentCountsUsed: false,
      portalAuthoritativeTotal: 84,
      reason: "Per explicit user instruction, document/PDF counts were NEVER used to determine row counts. All counts derive solely from the live portal's mapped competency data and its own server-computed total_min_target (47 Interpretative + 37 Procedural = 84), independently confirmed live on 2026-09-09.",
    },
    totals: { interpretative: interpTotal, procedural: procTotal, grandTotal: rows.length },
    skillsGenerated: Object.entries(perSkillCounts).map(([k, v]) => ({ skill: k, requested: v.requested, actual: v.actual, matches: v.requested === v.actual })),
    unmatchedSkills: unmatched,
    liveActionsTaken: 'Read-only portal mapping/quota verification only (login + GET requests). NO login, browser, or draft action was performed by THIS generator script itself - no Save as Draft, no Final Submit, no portal data modified.',
    originalMappingWorkbookUnchanged: originalWorkbookUnchanged,
    basicSurgicalSkillDatasetUnchanged: basicSurgicalUnchanged,
    gastrointestinalDatasetUnchanged: giUnchanged,
    reviewStatus: 'PENDING MANUAL REVIEW',
    uploadStatus: 'NOT UPLOADED',
  };
  fs.writeFileSync(path.join(REPORTS_DIR, 'generation-summary.json'), JSON.stringify(generationSummary, null, 2), 'utf-8');
  fs.writeFileSync(path.join(REPORTS_DIR, 'generated-rows-raw.json'), JSON.stringify(rows, null, 2), 'utf-8');

  logger.info(`Wrote all report files to ${REPORTS_DIR}`);
  logger.info(`originalMappingWorkbookUnchanged=${originalWorkbookUnchanged}, basicSurgicalSkillDatasetUnchanged=${basicSurgicalUnchanged}, gastrointestinalDatasetUnchanged=${giUnchanged}`);
  logger.info('STOPPED after dry-run validation, as instructed. No login/browser/draft action was performed by this generator.');
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

main().catch((err) => {
  logger.error(`generate-disorders-of-the-breast-dataset crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
