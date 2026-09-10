/**
 * Synthetic test-dataset generator for Urology (Interpretative Skill +
 * Procedural skill).
 *
 * Like the Neurosurgery dataset, this uses the USER'S EXACT PROVIDED
 * COUNTS as the sole authority for row counts (37 Interpretative + 29
 * Procedural = 66) - per explicit instruction, the portal's own mapped
 * minimums are NOT used to size this dataset, and are recorded only for
 * traceability in the specialty config. The live portal IS still used
 * (read-only, via output/form-map.json) to verify exact skill names,
 * field schemas, and valid competence levels - never fabricated.
 *
 * All generated cases are written to be Urology-Surgical-Unit appropriate
 * per explicit instruction (surgical training context, not general
 * medical/nephrology-only cases).
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

const SPECIALTY_DIR = path.join(PROJECT_ROOT, 'generated-data', 'Urology');
const DATE_RANGE_LABEL = '01-01-2026_to_30-06-2026';
const DATE_RANGE_DIR = path.join(SPECIALTY_DIR, DATE_RANGE_LABEL);
const GENERATED_DIR = path.join(DATE_RANGE_DIR, 'generated');
const REPORTS_DIR = path.join(DATE_RANGE_DIR, 'reports');
const CONFIG_PATH = path.join(SPECIALTY_DIR, 'specialty-config', 'urology.json');

const DATASET_XLSX_PATH = path.join(GENERATED_DIR, 'BCPS_Logbook_Urology_01-01-2026_to_30-06-2026.xlsx');

const FORM_LABEL = 'Procedural and Interpretative Skills';
const CASE_TYPE_LABEL = 'Urology';

// The user's originally-provided skill list (see the task prompt) spelled
// these 3 Procedural skills without a trailing space; the live portal's
// own competency label carries one. The portal's exact string (with the
// trailing space) is used as authoritative everywhere in this generator -
// including specialty-config/urology.json - both because it is the
// portal-verified name AND because the proven upload pipeline's checkbox
// matcher (toDomCompetencyText) requires competency names verbatim,
// trailing spaces included, to check the correct live checkbox.
const USER_PROVIDED_LABEL_DIFFERENCES: { skillType: 'Procedural skill'; userProvidedName: string; portalName: string }[] = [
  { skillType: 'Procedural skill', userProvidedName: 'Orchidectomy', portalName: 'Orchidectomy ' },
  { skillType: 'Procedural skill', userProvidedName: 'Pyelolithotomy', portalName: 'Pyelolithotomy ' },
  { skillType: 'Procedural skill', userProvidedName: 'Ureterolithotomy', portalName: 'Ureterolithotomy ' },
];

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
// Clinical content - concise, FCPS-logbook style, Urology-Surgical-Unit
// specific. Styled after the real BCPS Core Surgical Training logbook
// (style reference only - no real patient names, reg numbers, dates,
// ages, or patient-identifiable diagnoses were copied). Every diagnosis
// is deliberately matched to the exact skill/procedure per the surgical-
// unit realism rules (no cross-skill mismatches, no unrelated general-
// medical/nephrology-only cases).
// ---------------------------------------------------------------------
const INTERPRETATIVE_SCENARIOS: Record<string, InterpScenario[]> = {
  'CT scan/MRI/angiogram': [
    { diagnosis: 'Renal mass.', notes: 'CT scan shows a well-defined enhancing renal mass, likely renal cell carcinoma.', description: 'CT scan of abdomen for renal mass.', targetAge: 58 },
    { diagnosis: 'Renal vascular lesion.', notes: 'CT angiogram shows a renal artery stenosis.', description: 'CT angiogram for suspected renal vascular lesion.', targetAge: 52 },
    { diagnosis: 'Complex renal lesion.', notes: 'MRI shows a Bosniak III complex renal cyst.', description: 'MRI for complex renal lesion characterization.', targetAge: 47 },
  ],
  'CT-urogram': [
    { diagnosis: 'Hematuria under evaluation.', notes: 'CT urogram shows a filling defect in the right ureter, likely calculus.', description: 'CT urogram for hematuria evaluation.', targetAge: 44 },
    { diagnosis: 'Suspected urinary tract obstruction.', notes: 'CT urogram shows left-sided hydronephrosis with a PUJ transition point.', description: 'CT urogram for suspected obstruction.', targetAge: 29 },
    { diagnosis: 'Renal mass.', notes: 'CT urogram shows an enhancing mass in the lower pole of the right kidney.', description: 'CT urogram for renal mass characterization.', targetAge: 61 },
  ],
  'DMSA/DTPA scan': [
    { diagnosis: 'PUJ obstruction.', notes: 'DTPA scan shows delayed drainage from the left kidney with reduced differential function.', description: 'DTPA scan for PUJ obstruction assessment.', targetAge: 19 },
  ],
  IVU: [
    { diagnosis: 'Hydronephrosis.', notes: 'IVU shows delayed excretion with dilatation of the left pelvicalyceal system.', description: 'IVU for hydronephrosis evaluation.', targetAge: 33 },
    { diagnosis: 'Ureteric obstruction.', notes: 'IVU shows a column of contrast cut-off at the mid-ureter.', description: 'IVU for suspected ureteric obstruction.', targetAge: 41 },
    { diagnosis: 'Urinary tract calculus.', notes: 'IVU shows a radio-opaque shadow along the course of the right ureter.', description: 'IVU for suspected urinary calculus.', targetAge: 37 },
  ],
  'Renal biopsy report interpretation': [
    { diagnosis: 'Renal mass under evaluation for surgical management.', notes: 'Renal biopsy report shows features consistent with clear cell renal cell carcinoma, confirming the need for partial nephrectomy.', description: 'Renal biopsy report interpretation prior to renal mass surgery.', targetAge: 55 },
  ],
  'Renal function test': [
    { diagnosis: 'Obstructive uropathy.', notes: 'Renal function test shows elevated serum creatinine, consistent with obstructive nephropathy.', description: 'Renal function test for obstructive uropathy.', targetAge: 50 },
    { diagnosis: 'Hydronephrosis.', notes: 'Renal function test shows mildly elevated creatinine with preserved overall renal function.', description: 'Renal function test in hydronephrosis.', targetAge: 36 },
    { diagnosis: 'Bilateral urinary tract obstruction.', notes: 'Renal function test shows significantly deranged renal parameters.', description: 'Renal function test for bilateral obstruction.', targetAge: 64 },
    { diagnosis: 'Preoperative renal function assessment for urological surgery.', notes: 'Renal function test shows normal serum creatinine and electrolytes.', description: 'Preoperative renal function test.', targetAge: 45 },
    { diagnosis: 'Renal impairment associated with urinary obstruction.', notes: 'Renal function test shows improving creatinine trend after catheter drainage.', description: 'Renal function test follow-up after decompression.', targetAge: 59 },
  ],
  'USG of genitourinary system': [
    { diagnosis: 'Hydronephrosis.', notes: 'USG shows moderate hydronephrosis of the right kidney.', description: 'USG of genitourinary system for hydronephrosis.', targetAge: 28 },
    { diagnosis: 'Renal calculus.', notes: 'USG shows a hyperechoic focus with posterior shadowing in the left kidney.', description: 'USG of genitourinary system for renal calculus.', targetAge: 39 },
    { diagnosis: 'Bladder stone.', notes: 'USG shows a mobile hyperechoic shadow within the bladder lumen.', description: 'USG of genitourinary system for bladder stone.', targetAge: 62 },
    { diagnosis: 'Urinary retention.', notes: 'USG shows a distended urinary bladder with post-void residual volume.', description: 'USG of genitourinary system for urinary retention.', targetAge: 67 },
    { diagnosis: 'Prostatic enlargement.', notes: 'USG shows an enlarged prostate causing bladder outlet indentation.', description: 'USG of genitourinary system for prostatic enlargement.', targetAge: 66 },
  ],
  'Urine C/S': [
    { diagnosis: 'Complicated urinary tract infection.', notes: 'Urine culture grows E. coli, sensitive to nitrofurantoin.', description: 'Urine culture and sensitivity for complicated UTI.', targetAge: 34 },
    { diagnosis: 'UTI with urinary obstruction.', notes: 'Urine culture grows Klebsiella species, sensitive to ceftriaxone.', description: 'Urine culture and sensitivity in obstructed system.', targetAge: 48 },
    { diagnosis: 'Catheter-associated urinary infection.', notes: 'Urine culture grows Pseudomonas species.', description: 'Urine culture and sensitivity, catheter-associated infection.', targetAge: 71 },
  ],
  'Urine routine and microscopical examination': [
    { diagnosis: 'Hematuria.', notes: 'Urine microscopy shows numerous red blood cells.', description: 'Urine R/M/E for hematuria.', targetAge: 40 },
    { diagnosis: 'Suspected UTI.', notes: 'Urine microscopy shows plenty of pus cells.', description: 'Urine R/M/E for suspected UTI.', targetAge: 27 },
    { diagnosis: 'Urolithiasis.', notes: 'Urine microscopy shows crystalluria.', description: 'Urine R/M/E for urolithiasis.', targetAge: 35 },
    { diagnosis: 'Urinary tract obstruction.', notes: 'Urine microscopy shows mild pyuria with occasional red cells.', description: 'Urine R/M/E in obstructed system.', targetAge: 53 },
    { diagnosis: 'Preoperative urological assessment.', notes: 'Urine microscopy shows no significant abnormality.', description: 'Preoperative urine R/M/E.', targetAge: 46 },
  ],
  Uroflowmetry: [
    { diagnosis: 'Lower urinary tract symptoms.', notes: 'Uroflowmetry shows a reduced maximum flow rate with a flattened curve.', description: 'Uroflowmetry for lower urinary tract symptoms.', targetAge: 63 },
    { diagnosis: 'Suspected bladder outlet obstruction.', notes: 'Uroflowmetry shows prolonged voiding time with low peak flow.', description: 'Uroflowmetry for suspected bladder outlet obstruction.', targetAge: 65 },
    { diagnosis: 'Urethral stricture follow-up.', notes: 'Uroflowmetry shows improved flow rate compared to pre-treatment baseline.', description: 'Uroflowmetry, post-urethrotomy follow-up.', targetAge: 42 },
  ],
  'X-ray KUB': [
    { diagnosis: 'Renal calculus.', notes: 'X-ray KUB shows a radio-opaque shadow overlying the right renal shadow.', description: 'X-ray KUB for renal calculus.', targetAge: 31 },
    { diagnosis: 'Ureteric calculus.', notes: 'X-ray KUB shows a radio-opaque shadow along the line of the left ureter.', description: 'X-ray KUB for ureteric calculus.', targetAge: 38 },
    { diagnosis: 'Vesical calculus.', notes: 'X-ray KUB shows a rounded radio-opaque shadow in the pelvis overlying the bladder.', description: 'X-ray KUB for vesical calculus.', targetAge: 60 },
    { diagnosis: 'Suspected urinary tract stone.', notes: 'X-ray KUB shows no obvious radio-opaque shadow.', description: 'X-ray KUB for suspected urinary stone.', targetAge: 30 },
    { diagnosis: 'Renal calculus.', notes: 'X-ray KUB shows multiple small radio-opaque shadows in the left renal area.', description: 'X-ray KUB for multiple renal calculi.', targetAge: 49 },
  ],
};

const PROCEDURAL_SCENARIOS: Record<string, ProcScenario[]> = {
  'Amputation of penis': [
    { diagnosis: 'Carcinoma penis.', notes: 'Partial amputation of penis performed with adequate margin, inguinal node assessment planned.', description: 'Amputation of penis for carcinoma.', targetAge: 64, level: '2' },
  ],
  Circumcision: [
    { diagnosis: 'Phimosis.', notes: 'Circumcision performed under general anesthesia with dorsal slit technique.', description: 'Circumcision for phimosis.', targetAge: 6, level: '3' },
    { diagnosis: 'Recurrent balanoposthitis.', notes: 'Circumcision performed for recurrent balanoposthitis, foreskin sent for histopathology.', description: 'Circumcision for recurrent balanoposthitis.', targetAge: 9, level: '3' },
    { diagnosis: 'Pathological phimosis.', notes: 'Circumcision performed with careful hemostasis, foreskin adhesions released.', description: 'Circumcision for pathological phimosis.', targetAge: 8, level: '4' },
  ],
  Cystolithtomy: [
    { diagnosis: 'Large bladder stone.', notes: 'Open cystolithotomy performed, stone retrieved intact, bladder closed in layers.', description: 'Cystolithotomy for large bladder stone.', targetAge: 57, level: '1' },
  ],
  Cystourethroscopy: [
    { diagnosis: 'Hematuria under evaluation.', notes: 'Cystourethroscopy performed, bladder mucosa inspected, no obvious lesion seen.', description: 'Cystourethroscopy for hematuria evaluation.', targetAge: 54, level: '1' },
  ],
  Meatoplasty: [
    { diagnosis: 'Meatal stenosis.', notes: 'Meatoplasty performed with ventral meatotomy and mucosal advancement.', description: 'Meatoplasty for meatal stenosis.', targetAge: 5, level: '1' },
  ],
  'Optical internal urethrotomy': [
    { diagnosis: 'Short-segment urethral stricture.', notes: 'Optical internal urethrotomy performed under direct vision, stricture incised at the 12 o\'clock position.', description: 'Optical internal urethrotomy for urethral stricture.', targetAge: 43, level: '1' },
  ],
  'Orchidectomy ': [
    { diagnosis: 'Testicular tumour.', notes: 'Radical inguinal orchidectomy performed with high ligation of the spermatic cord.', description: 'Orchidectomy for testicular tumour.', targetAge: 32, level: '3' },
    { diagnosis: 'Torsion with non-viable testis.', notes: 'Orchidectomy performed for a non-viable testis following exploration for torsion.', description: 'Orchidectomy for non-viable testis.', targetAge: 17, level: '2' },
  ],
  Orchidopexy: [
    { diagnosis: 'Undescended testis.', notes: 'Orchidopexy performed via inguinal approach, testis fixed in the scrotal pouch.', description: 'Orchidopexy for undescended testis.', targetAge: 2, level: '1' },
  ],
  PCNL: [
    { diagnosis: 'Large renal stone.', notes: 'PCNL performed via a single percutaneous tract, stone fragmented and cleared.', description: 'PCNL for large renal stone.', targetAge: 46, level: '1' },
    { diagnosis: 'Staghorn calculus.', notes: 'PCNL performed with multiple tract access for staghorn calculus clearance.', description: 'PCNL for staghorn calculus.', targetAge: 51, level: '2' },
    { diagnosis: 'Multiple renal calculi.', notes: 'PCNL performed, multiple calculi fragmented and extracted.', description: 'PCNL for multiple renal calculi.', targetAge: 39, level: '1' },
  ],
  'Pyelolithotomy ': [
    { diagnosis: 'Large renal pelvis calculus.', notes: 'Open pyelolithotomy performed, stone delivered intact through pyelotomy incision.', description: 'Pyelolithotomy for renal pelvis calculus.', targetAge: 48, level: '1' },
  ],
  Pyeloplasty: [
    { diagnosis: 'PUJ obstruction.', notes: 'Anderson-Hynes pyeloplasty performed with excision of the stenosed segment and spatulated anastomosis.', description: 'Pyeloplasty for PUJ obstruction.', targetAge: 21, level: '1' },
  ],
  'Repair of bladder injury': [
    { diagnosis: 'Iatrogenic bladder injury.', notes: 'Repair of bladder injury done in two layers with catheter drainage.', description: 'Repair of bladder injury.', targetAge: 41, level: '2' },
  ],
  'Repair of ureteric injury': [
    { diagnosis: 'Iatrogenic ureteric injury.', notes: 'Repair of ureteric injury done with primary uretero-ureteric anastomosis over a stent.', description: 'Repair of ureteric injury.', targetAge: 37, level: '2' },
  ],
  Suprapubiccystostomy: [
    { diagnosis: 'Acute urinary retention with failed urethral catheterization.', notes: 'Suprapubic cystostomy performed under local anesthesia after failed urethral catheterization.', description: 'Suprapubic cystostomy for urinary retention.', targetAge: 70, level: '2' },
  ],
  URS: [
    { diagnosis: 'Distal ureteric stone.', notes: 'URS performed, stone fragmented with laser lithotripsy, DJ stent placed.', description: 'URS for distal ureteric stone.', targetAge: 33, level: '1' },
    { diagnosis: 'Mid-ureteric calculus.', notes: 'URS performed with successful stone fragmentation and clearance.', description: 'URS for mid-ureteric calculus.', targetAge: 29, level: '1' },
    { diagnosis: 'Upper ureteric stone.', notes: 'URS performed, stone pushed and fragmented, stent placed for drainage.', description: 'URS for upper ureteric stone.', targetAge: 45, level: '2' },
  ],
  'Ureterolithotomy ': [
    { diagnosis: 'Impacted ureteric calculus.', notes: 'Open ureterolithotomy performed after failed endoscopic management, stone retrieved intact.', description: 'Ureterolithotomy for impacted ureteric calculus.', targetAge: 50, level: '1' },
  ],
  Ureteroscopy: [
    { diagnosis: 'Ureteric calculus.', notes: 'Diagnostic ureteroscopy performed, calculus visualized in the mid-ureter.', description: 'Ureteroscopy for ureteric calculus.', targetAge: 36, level: '1' },
  ],
  'Urethral catheterization': [
    { diagnosis: 'Acute urinary retention.', notes: 'Urethral catheterization performed successfully with a 16 Fr Foley catheter.', description: 'Urethral catheterization for acute retention.', targetAge: 69, level: '3' },
    { diagnosis: 'Chronic urinary retention.', notes: 'Urethral catheterization performed, large residual volume drained.', description: 'Urethral catheterization for chronic retention.', targetAge: 73, level: '3' },
    { diagnosis: 'Benign prostatic enlargement with retention.', notes: 'Urethral catheterization performed after initial difficulty, using a coude-tip catheter.', description: 'Urethral catheterization for BPE with retention.', targetAge: 68, level: '3' },
    { diagnosis: 'Postoperative urinary retention.', notes: 'Urethral catheterization performed for postoperative urinary retention.', description: 'Urethral catheterization, postoperative.', targetAge: 56, level: '4' },
    { diagnosis: 'Bladder outlet obstruction.', notes: 'Urethral catheterization performed for bladder outlet obstruction, catheter secured.', description: 'Urethral catheterization for bladder outlet obstruction.', targetAge: 66, level: '4' },
  ],
};

const MALE_FIRST = [
  'Md. Kamal', 'Abdul', 'Mohammad Arif', 'Md. Zahirul', 'Tanvir', 'Md. Nurul', 'Shahidul', 'Md. Rafiqul',
  'Golam', 'Md. Aminul', 'Habibur', 'Md. Shafiqul', 'Anisur', 'Md. Jahangir', 'Rezaul', 'Md. Mahbubur',
  'Little Rahat', 'Little Arafat', 'Little Sajib', 'Little Fahim',
];
const FEMALE_FIRST = [
  'Rahima', 'Nasrin', 'Farzana', 'Salma', 'Sharmin', 'Rokeya', 'Shirin', 'Nasima', 'Marufa', 'Taslima',
  'Rehana', 'Shahnaz', 'Fatema', 'Rubina', 'Momena', 'Shahana', 'Rashida', 'Parveen', 'Halima', 'Aleya',
];
const SURNAMES = [
  'Hossain', 'Begum', 'Karim', 'Akter', 'Hasan', 'Yasmin', 'Islam', 'Khatun', 'Ahmed', 'Sultana',
  'Rahman', 'Chowdhury', 'Alam', 'Miah', 'Uddin', 'Khan', 'Talukder', 'Sarkar', 'Molla', 'Bhuiyan',
];

// Urology skews heavily male (penile/scrotal/testicular procedures dominate
// the Procedural list) - build a male-majority pool while keeping female
// names available for the genderless Interpretative-Skill investigations.
function buildUniqueNamePool(count: number, seed: number): string[] {
  const names = new Set<string>();
  const firsts = shuffle([...MALE_FIRST, ...MALE_FIRST, ...MALE_FIRST, ...FEMALE_FIRST], seed);
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
// user explicitly permits "multiple cases may occur on the same date where
// realistic") - only patient identity fields (name/regNo/ExternalRowId)
// must stay unique, not the date itself.
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
    const dates = buildAssignmentDates(skill.count, 5000 + globalIndex);
    for (let i = 0; i < skill.count; i++) {
      const scenario = bank[i];
      const { dob, age } = resolveDobAge(dates[i], scenario.targetAge, 15000 + globalIndex);
      rows.push({
        externalRowId: `URO-${(globalIndex + 1).toString().padStart(3, '0')}`,
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
    const dates = buildAssignmentDates(skill.count, 6000 + globalIndex);
    for (let i = 0; i < skill.count; i++) {
      const scenario = bank[i];
      const { dob, age } = resolveDobAge(dates[i], scenario.targetAge, 16000 + globalIndex);
      rows.push({
        externalRowId: `URO-${(globalIndex + 1).toString().padStart(3, '0')}`,
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
  logger.info('Generating Urology dataset (USER-PROVIDED EXACT COUNTS, dry-run only).');

  const realWorkbookStatBefore = fs.statSync(REAL_XLSX_PATH);
  const priorDatasetDirs = ['Basic-Surgical-Skill', 'Gastrointestinal-HepatoBiliary-Pancreas', 'Disorders-of-the-Breast', 'Neurosurgery'].map((name) => path.join(PROJECT_ROOT, 'generated-data', name));
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
  logger.info(`All 29 configured skills matched exactly to the mapped portal data (${USER_PROVIDED_LABEL_DIFFERENCES.length} trailing-space/label difference(s) vs. the user-provided list recorded), and all requested competence levels are portal-valid.`);

  const interpPlanned = config.skills['Interpretative Skill'].reduce((s, sk) => s + sk.count, 0);
  const procPlanned = config.skills['Procedural skill'].reduce((s, sk) => s + sk.count, 0);
  const totalRowsPlanned = interpPlanned + procPlanned;
  if (interpPlanned !== 37 || procPlanned !== 29 || totalRowsPlanned !== 66) {
    logger.error(`Config totals (Interpretative=${interpPlanned}, Procedural=${procPlanned}, Grand=${totalRowsPlanned}) do not match the required exact totals (37/29/66). STOP.`);
    process.exit(1);
  }
  logger.info(`Total rows planned (USER-PROVIDED EXACT COUNT, not portal quota): ${totalRowsPlanned} (Interpretative=${interpPlanned}, Procedural=${procPlanned})`);

  const namePool = buildUniqueNamePool(totalRowsPlanned, 9191);
  const regNoPool = buildUniqueRegNos(totalRowsPlanned, 10101);

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
  logger.info('DOB/Age verification passed for all rows (DOB before Assignment Date, exact completed age).');

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
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalSkillsRequested: 29,
        totalSkillsMatched: 29,
        unmatchedSkills: unmatched,
        labelDifferencesVsUserProvidedList: USER_PROVIDED_LABEL_DIFFERENCES,
        labelDifferencesVsConfig: labelDifferences,
        levelMismatches,
      },
      null,
      2
    ),
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
    specialty: 'Urology',
    trainingContext: 'Surgical Unit / Urology Surgical Unit',
    dateRange: { label: DATE_RANGE_LABEL, from: '2026-01-01', to: '2026-06-30' },
    datasetWorkbook: DATASET_XLSX_PATH,
    quotaDecision: {
      countSource: 'USER_PROVIDED_EXACT_COUNTS',
      portalQuotaUsedToSizeDataset: false,
      reason: 'Per explicit user instruction, this dataset uses the exact counts the user provided (37 Interpretative + 29 Procedural = 66). The portal\'s own mapped minimums were NOT used to size this dataset - recorded in specialty-config/urology.json for traceability only.',
    },
    competenceLevelHandling: 'For every Procedural skill with more than one allowed competence level, individual rows use varying portal-valid levels (never multiplying row count) - see procedural_competenceLevelUsage in row-count-summary.json for the exact levels used per skill.',
    totals: { interpretative: interpTotal, procedural: procTotal, grandTotal: rows.length },
    skillsGenerated: Object.entries(perSkillCounts).map(([k, v]) => ({ skill: k, requested: v.requested, actual: v.actual, matches: v.requested === v.actual })),
    unmatchedSkills: unmatched,
    labelDifferencesVsUserProvidedList: USER_PROVIDED_LABEL_DIFFERENCES,
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
  logger.error(`generate-urology-dataset crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
