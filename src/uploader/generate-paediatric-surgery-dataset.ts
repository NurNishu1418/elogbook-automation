/**
 * Synthetic test-dataset generator for Paediatric Surgery (Interpretative
 * Skill + Procedural skill).
 *
 * Like the Neurosurgery, Urology, Orthopaedic Surgery, and Parasites of
 * Surgical Importance datasets, this uses the USER'S EXACT PROVIDED
 * PER-SKILL COUNTS as the sole authority for row counts - per explicit
 * instruction, the portal's own mapped minimums are NOT used to size
 * this dataset, and are recorded only for traceability in the specialty
 * config. The live portal IS still used (read-only, via
 * output/form-map.json) to verify exact skill names, field schemas, and
 * valid competence levels - never fabricated.
 *
 * IMPORTANT: the user's task prompt stated "Procedural total = EXACTLY
 * 24 rows" / "GRAND TOTAL = EXACTLY 48 ROWS", but the itemized per-skill
 * Procedural counts the user provided sum to 25, not 24. This was
 * flagged to the user before any generation occurred; the user replied
 * "do" to proceed, and - consistent with the precedent set earlier in
 * this project for the Basic Surgical Skill dataset's analogous
 * discrepancy - the itemized breakdown was treated as authoritative.
 * Final totals: Interpretative = 24, Procedural = 25, Grand Total = 49.
 * See specialty-config/paediatric-surgery.json ->
 * quotaSource.arithmeticDiscrepancyResolved for full detail.
 *
 * All generated cases are written to be Paediatric-Surgical-Unit
 * appropriate, with condition-specific paediatric ages (not a generic
 * age spread) per the user's explicit "CRITICAL" age-realism
 * instruction.
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

const SPECIALTY_DIR = path.join(PROJECT_ROOT, 'generated-data', 'Paediatric-Surgery');
const DATE_RANGE_LABEL = '01-01-2026_to_30-06-2026';
const DATE_RANGE_DIR = path.join(SPECIALTY_DIR, DATE_RANGE_LABEL);
const GENERATED_DIR = path.join(DATE_RANGE_DIR, 'generated');
const REPORTS_DIR = path.join(DATE_RANGE_DIR, 'reports');
const CONFIG_PATH = path.join(SPECIALTY_DIR, 'specialty-config', 'paediatric-surgery.json');

const DATASET_XLSX_PATH = path.join(GENERATED_DIR, 'BCPS_Logbook_Paediatric_Surgery_01-01-2026_to_30-06-2026.xlsx');

const FORM_LABEL = 'Procedural and Interpretative Skills';
const CASE_TYPE_LABEL = 'Paediatric Surgery';

const EXPECTED_INTERPRETATIVE_TOTAL = 24;
const EXPECTED_PROCEDURAL_TOTAL = 25;
const EXPECTED_GRAND_TOTAL = 49;

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
// Clinical content - concise, FCPS-logbook style, Paediatric-Surgical-
// Unit specific. Styled after the real BCPS Core Surgical Training
// logbook (style reference only - no real patient names, reg numbers,
// dates, ages, or patient-identifiable diagnoses were copied). Every
// diagnosis is deliberately matched to the exact skill/procedure and to
// a condition-appropriate paediatric age (no adult ages, no generic
// age spread) per the surgical-unit and age-realism rules.
// ---------------------------------------------------------------------
const INTERPRETATIVE_SCENARIOS: Record<string, InterpScenario[]> = {
  'Contrast X-rays': [
    { diagnosis: 'Suspected intestinal obstruction.', notes: 'Contrast X-ray shows a dilated bowel loop with a transition point in the distal colon.', description: 'Contrast study for suspected intestinal obstruction.', targetAge: 0 },
    { diagnosis: 'Hirschsprung disease evaluation.', notes: 'Contrast enema shows a transition zone in the rectosigmoid region.', description: 'Contrast enema for suspected Hirschsprung disease.', targetAge: 1 },
    { diagnosis: 'Colorectal congenital anomaly.', notes: 'Contrast study shows an abnormal fistulous communication in a case of anorectal malformation.', description: 'Contrast study for anorectal malformation.', targetAge: 0 },
  ],
  Histopathology: [
    { diagnosis: 'Cervical lymphadenopathy.', notes: 'Histopathology of the excised lymph node shows reactive hyperplasia.', description: 'Histopathology of excised cervical lymph node.', targetAge: 5 },
    { diagnosis: 'Excised congenital lesion.', notes: 'Histopathology confirms a benign congenital dermoid cyst.', description: 'Histopathology of excised congenital lesion.', targetAge: 2 },
    { diagnosis: 'Paediatric abdominal tumour under surgical evaluation.', notes: 'Histopathology confirms a benign teratoma.', description: 'Histopathology of excised abdominal mass.', targetAge: 4 },
  ],
  Invertogram: [
    { diagnosis: 'Anorectal malformation.', notes: 'Invertogram shows the rectal gas shadow above the pubococcygeal line, consistent with a high anomaly.', description: 'Invertogram for anorectal malformation.', targetAge: 0 },
    { diagnosis: 'Imperforate anus.', notes: 'Invertogram shows the rectal pouch just below the pubococcygeal line, consistent with a low anomaly.', description: 'Invertogram for imperforate anus.', targetAge: 0 },
    { diagnosis: 'Suspected high anorectal anomaly.', notes: 'Invertogram confirms a high rectal pouch with no visible perineal fistula.', description: 'Invertogram for suspected high anorectal anomaly.', targetAge: 0 },
  ],
  'Plain X-ray Abdomen': [
    { diagnosis: 'Intestinal obstruction.', notes: 'Plain X-ray abdomen shows multiple dilated bowel loops with air-fluid levels.', description: 'Plain X-ray abdomen for intestinal obstruction.', targetAge: 2 },
    { diagnosis: 'Neonatal bowel obstruction.', notes: "Plain X-ray abdomen shows a 'double bubble' sign, suggestive of duodenal atresia.", description: 'Plain X-ray abdomen for neonatal bowel obstruction.', targetAge: 0 },
    { diagnosis: 'Acute abdomen.', notes: 'Plain X-ray abdomen shows free gas under the diaphragm, suggestive of perforation.', description: 'Plain X-ray abdomen for acute abdomen.', targetAge: 6 },
  ],
  'Plain X-ray KUB': [
    { diagnosis: 'Urinary tract obstruction.', notes: 'Plain X-ray KUB shows no radio-opaque shadow; findings inconclusive for obstruction.', description: 'Plain X-ray KUB for urinary tract obstruction.', targetAge: 3 },
    { diagnosis: 'Paediatric urological evaluation.', notes: 'Plain X-ray KUB shows a normal renal outline and no calcification.', description: 'Plain X-ray KUB, preoperative urological evaluation.', targetAge: 7 },
    { diagnosis: 'Urinary calculus.', notes: 'Plain X-ray KUB shows a radio-opaque shadow overlying the left renal shadow.', description: 'Plain X-ray KUB for suspected urinary calculus.', targetAge: 10 },
  ],
  USG: [
    { diagnosis: 'Suspected hypertrophic pyloric stenosis.', notes: 'USG shows a thickened pyloric muscle with an elongated pyloric channel.', description: 'USG abdomen for suspected pyloric stenosis.', targetAge: 0 },
    { diagnosis: 'Undescended testis.', notes: 'USG shows the testis lying within the inguinal canal.', description: 'USG for undescended testis localization.', targetAge: 1 },
    { diagnosis: 'Hydrocele.', notes: 'USG shows anechoic fluid collection around the testis, consistent with a communicating hydrocele.', description: 'USG scrotum for hydrocele.', targetAge: 1 },
  ],
  'Urine analysis': [
    { diagnosis: 'Urinary tract obstruction.', notes: 'Urine analysis shows mild pyuria with no significant bacteriuria.', description: 'Urine analysis for urinary tract obstruction.', targetAge: 4 },
    { diagnosis: 'Paediatric UTI associated with posterior urethral valve.', notes: 'Urine analysis shows plenty of pus cells and bacteriuria.', description: 'Urine analysis for paediatric UTI.', targetAge: 2 },
    { diagnosis: 'Preoperative urological assessment.', notes: 'Urine analysis shows no significant abnormality.', description: 'Preoperative urine analysis.', targetAge: 6 },
  ],
  'X-ray chest P/A': [
    { diagnosis: 'Preoperative assessment before major paediatric surgery.', notes: 'X-ray chest P/A shows clear lung fields with no active disease.', description: 'X-ray chest P/A, preoperative assessment.', targetAge: 5 },
    { diagnosis: 'Suspected congenital diaphragmatic hernia.', notes: 'X-ray chest P/A shows bowel loops within the left hemithorax.', description: 'X-ray chest P/A for suspected diaphragmatic hernia.', targetAge: 0 },
    { diagnosis: 'Preoperative fitness assessment for major paediatric surgery.', notes: 'X-ray chest P/A shows a normal cardiothoracic ratio and clear lung fields.', description: 'X-ray chest P/A, preoperative fitness assessment.', targetAge: 8 },
  ],
};

const PROCEDURAL_SCENARIOS: Record<string, ProcScenario[]> = {
  'Central venous line insertion': [
    { diagnosis: 'Need for total parenteral nutrition after major bowel surgery.', notes: 'Central venous line inserted via the internal jugular vein under ultrasound guidance.', description: 'Central venous line insertion for TPN access.', targetAge: 1, level: '2' },
    { diagnosis: 'Critically ill paediatric surgical patient requiring central access.', notes: 'Central venous line inserted via the subclavian route for hemodynamic monitoring and drug administration.', description: 'Central venous line insertion in critically ill child.', targetAge: 3, level: '3' },
  ],
  'Chordee correction in hypospadias': [
    { diagnosis: 'Distal hypospadias with chordee.', notes: 'Chordee correction performed with degloving of the penile skin and release of fibrous chordee tissue.', description: 'Chordee correction for hypospadias.', targetAge: 2, level: '1' },
  ],
  Circumcision: [
    { diagnosis: 'Phimosis.', notes: 'Circumcision performed under general anesthesia with a dorsal slit technique.', description: 'Circumcision for phimosis.', targetAge: 5, level: '2' },
    { diagnosis: 'Recurrent balanoposthitis.', notes: 'Circumcision performed for recurrent balanoposthitis, foreskin sent for histopathology.', description: 'Circumcision for recurrent balanoposthitis.', targetAge: 7, level: '2' },
    { diagnosis: 'Pathological phimosis.', notes: 'Circumcision performed with careful hemostasis and release of preputial adhesions.', description: 'Circumcision for pathological phimosis.', targetAge: 9, level: '3' },
  ],
  'Cutback procedure for ectopic stenosed anus': [
    { diagnosis: 'Ectopic stenosed anus.', notes: 'Cutback procedure performed with incision of the perineal skin bridge to widen the stenotic anal opening.', description: 'Cutback procedure for ectopic stenosed anus.', targetAge: 1, level: '1' },
  ],
  'Drainage of abscess': [
    { diagnosis: 'Perianal abscess.', notes: 'Incision and drainage of perianal abscess performed under general anesthesia.', description: 'Drainage of perianal abscess.', targetAge: 1, level: '2' },
    { diagnosis: 'Paediatric superficial soft tissue abscess.', notes: 'Incision and drainage of superficial abscess performed with the wound packed open.', description: 'Drainage of superficial abscess.', targetAge: 4, level: '2' },
    { diagnosis: 'Neck abscess.', notes: 'Incision and drainage of neck abscess performed with care to avoid major neurovascular structures.', description: 'Drainage of neck abscess.', targetAge: 6, level: '3' },
  ],
  Herniotomy: [
    { diagnosis: 'Right inguinal hernia.', notes: 'Herniotomy performed through a right inguinal crease incision with high ligation of the sac.', description: 'Herniotomy for right inguinal hernia.', targetAge: 1, level: '2' },
    { diagnosis: 'Left inguinal hernia.', notes: 'Herniotomy performed through a left inguinal crease incision with high ligation of the sac.', description: 'Herniotomy for left inguinal hernia.', targetAge: 3, level: '2' },
    { diagnosis: 'Bilateral inguinal hernia.', notes: 'Bilateral herniotomy performed in the same sitting with high ligation of both sacs.', description: 'Herniotomy for bilateral inguinal hernia.', targetAge: 0, level: '3' },
  ],
  Hydrocelectomy: [
    { diagnosis: 'Right congenital hydrocele.', notes: 'Hydrocelectomy performed through an inguinal approach with high ligation of the processus vaginalis.', description: 'Hydrocelectomy for right congenital hydrocele.', targetAge: 2, level: '2' },
    { diagnosis: 'Left congenital hydrocele.', notes: 'Hydrocelectomy performed through an inguinal approach with excision of the redundant sac.', description: 'Hydrocelectomy for left congenital hydrocele.', targetAge: 3, level: '2' },
    { diagnosis: 'Communicating hydrocele.', notes: 'Hydrocelectomy performed with high ligation of the patent processus vaginalis and partial excision of the sac.', description: 'Hydrocelectomy for communicating hydrocele.', targetAge: 1, level: '3' },
  ],
  'Intraosseous infusion': [
    { diagnosis: 'Paediatric shock with difficult intravenous access.', notes: 'Intraosseous infusion established at the proximal tibia for emergency fluid resuscitation.', description: 'Intraosseous infusion for emergency vascular access.', targetAge: 4, level: '2' },
  ],
  'Lymph node biopsy': [
    { diagnosis: 'Persistent cervical lymph node enlargement.', notes: 'Excisional biopsy of the cervical lymph node performed, specimen sent for histopathology.', description: 'Lymph node biopsy for cervical lymphadenopathy.', targetAge: 6, level: '2' },
    { diagnosis: 'Cervical lymphadenopathy.', notes: 'Excisional lymph node biopsy performed under general anesthesia.', description: 'Lymph node biopsy for cervical lymphadenopathy.', targetAge: 8, level: '2' },
    { diagnosis: 'Suspicious lymphadenopathy requiring tissue diagnosis.', notes: 'Excisional biopsy of an enlarged suspicious lymph node performed with careful hemostasis.', description: 'Lymph node biopsy for suspicious lymphadenopathy.', targetAge: 10, level: '3' },
  ],
  Orchidopexy: [
    { diagnosis: 'Right undescended testis.', notes: 'Orchidopexy performed via inguinal approach with mobilization of the spermatic cord and fixation in the scrotal pouch.', description: 'Orchidopexy for undescended testis.', targetAge: 2, level: '1' },
  ],
  Pyloromyotomy: [
    { diagnosis: 'Infantile hypertrophic pyloric stenosis.', notes: 'Ramstedt pyloromyotomy performed through a right upper quadrant incision, mucosal integrity confirmed intact.', description: 'Pyloromyotomy for infantile hypertrophic pyloric stenosis.', targetAge: 0, level: '1' },
  ],
  'Suprapubic catheterization': [
    { diagnosis: 'Acute urinary retention with failed urethral catheterization.', notes: 'Suprapubic catheterization performed under local anesthesia after failed urethral catheterization.', description: 'Suprapubic catheterization for urinary retention.', targetAge: 7, level: '2' },
  ],
  'Temporary colostomy': [
    { diagnosis: 'High anorectal malformation.', notes: 'Temporary diverting colostomy fashioned in the descending colon to allow staged definitive repair.', description: 'Temporary colostomy for high anorectal malformation.', targetAge: 0, level: '1' },
  ],
  Urethroplasty: [
    { diagnosis: 'Distal hypospadias.', notes: 'Urethroplasty performed using the tubularized incised plate (TIP) technique to reconstruct the neourethra.', description: 'Urethroplasty for distal hypospadias.', targetAge: 2, level: '1' },
  ],
};

const MALE_FIRST = [
  'Little Rahat', 'Little Arafat', 'Little Sajib', 'Little Fahim', 'Little Rakib', 'Little Imran',
  'Little Nayeem', 'Little Sabbir', 'Little Tanjim', 'Little Ridoy', 'Little Sifat', 'Little Rafi',
];
const FEMALE_FIRST = [
  'Little Nusrat', 'Little Mim', 'Little Tania', 'Little Rima', 'Little Shila', 'Little Anika',
  'Little Ruma', 'Little Payel', 'Little Mitu', 'Little Jui', 'Little Priya', 'Little Sadia',
];
const SURNAMES = [
  'Hossain', 'Begum', 'Karim', 'Akter', 'Hasan', 'Yasmin', 'Islam', 'Khatun', 'Ahmed', 'Sultana',
  'Rahman', 'Chowdhury', 'Alam', 'Miah', 'Uddin', 'Khan', 'Talukder', 'Sarkar', 'Molla', 'Bhuiyan',
];

// This is a paediatric (0-10 years) dataset - name style adjusted to
// clearly read as child patients rather than the adult name pools used
// in prior specialties. Most Procedural skills here are male-specific
// (circumcision, hypospadias, hydrocele, orchidopexy), so the pool skews
// male, with female names available for the gender-neutral Interpretative
// investigations and the female-eligible Procedural skills (hernia,
// abscess, lymph node biopsy, central line, colostomy, IO infusion).
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
  // A 0-year-old's DOB can legitimately land on the exact same calendar
  // day as the Assignment Date (birthMonth===assignMonth,
  // birthDay===assignDay), which computes age 0 correctly but violates
  // "DOB must be strictly before Assignment Date." Nudge back one day
  // rather than reject - this keeps the completed age unchanged in
  // every practical case (including across a year boundary).
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
        externalRowId: `PED-${(globalIndex + 1).toString().padStart(3, '0')}`,
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
        externalRowId: `PED-${(globalIndex + 1).toString().padStart(3, '0')}`,
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
  logger.info('Generating Paediatric Surgery dataset (USER-PROVIDED EXACT COUNTS, dry-run only).');

  const realWorkbookStatBefore = fs.statSync(REAL_XLSX_PATH);
  const priorDatasetDirs = [
    'Basic-Surgical-Skill',
    'Gastrointestinal-HepatoBiliary-Pancreas',
    'Disorders-of-the-Breast',
    'Neurosurgery',
    'Urology',
    'Orthopaedic-Surgery',
    'Parasites-of-Surgical-Importance',
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
  logger.info(`All 22 configured skills matched exactly to the mapped portal data (${labelDifferences.length} label difference(s) found), and all requested competence levels are portal-valid.`);

  const interpPlanned = config.skills['Interpretative Skill'].reduce((s, sk) => s + sk.count, 0);
  const procPlanned = config.skills['Procedural skill'].reduce((s, sk) => s + sk.count, 0);
  const totalRowsPlanned = interpPlanned + procPlanned;
  if (interpPlanned !== EXPECTED_INTERPRETATIVE_TOTAL || procPlanned !== EXPECTED_PROCEDURAL_TOTAL || totalRowsPlanned !== EXPECTED_GRAND_TOTAL) {
    logger.error(
      `Config totals (Interpretative=${interpPlanned}, Procedural=${procPlanned}, Grand=${totalRowsPlanned}) do not match the resolved exact totals (${EXPECTED_INTERPRETATIVE_TOTAL}/${EXPECTED_PROCEDURAL_TOTAL}/${EXPECTED_GRAND_TOTAL}). STOP.`
    );
    process.exit(1);
  }
  logger.info(
    `Total rows planned (USER-PROVIDED EXACT COUNTS, itemized breakdown - see arithmeticDiscrepancyResolved in config): ${totalRowsPlanned} (Interpretative=${interpPlanned}, Procedural=${procPlanned})`
  );

  const namePool = buildUniqueNamePool(totalRowsPlanned, 15655);
  const regNoPool = buildUniqueRegNos(totalRowsPlanned, 16766);

  const rows = generateRows(config, namePool, regNoPool);
  logger.info(`Generated ${rows.length} rows.`);

  const ageErrors: string[] = [];
  for (const r of rows) {
    const recomputed = calculateAge(r.dateOfBirth, r.dateOfAssignment);
    if (recomputed !== r.age) ageErrors.push(`${r.externalRowId}: DOB=${r.dateOfBirth}, AssignDate=${r.dateOfAssignment}, stored=${r.age}, recomputed=${recomputed}`);
    if (new Date(r.dateOfBirth) >= new Date(r.dateOfAssignment)) ageErrors.push(`${r.externalRowId}: DOB (${r.dateOfBirth}) is not before Assignment Date (${r.dateOfAssignment}).`);
    if (r.age > 12) ageErrors.push(`${r.externalRowId}: age ${r.age} is not a plausible Paediatric Surgery age.`);
  }
  if (ageErrors.length > 0) {
    logger.error(`DOB/Age verification FAILED for ${ageErrors.length} issue(s):`);
    ageErrors.forEach((e) => logger.error(`  ${e}`));
    process.exit(1);
  }
  logger.info('DOB/Age verification passed for all rows (DOB before Assignment Date, exact completed age, paediatric-appropriate).');

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
    JSON.stringify({ generatedAt: new Date().toISOString(), totalSkillsRequested: 22, totalSkillsMatched: 22, unmatchedSkills: unmatched, labelDifferences, levelMismatches }, null, 2),
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
    specialty: 'Paediatric Surgery',
    trainingContext: 'Paediatric Surgical Unit',
    dateRange: { label: DATE_RANGE_LABEL, from: '2026-01-01', to: '2026-06-30' },
    datasetWorkbook: DATASET_XLSX_PATH,
    quotaDecision: {
      countSource: 'USER_PROVIDED_EXACT_COUNTS_ITEMIZED',
      portalQuotaUsedToSizeDataset: false,
      arithmeticDiscrepancy:
        "The user's stated 'Procedural total = 24' / 'Grand Total = 48' did not match the itemized per-skill counts the user provided (sum = 25 Procedural, 49 Grand Total). This was flagged to the user before generation; the user replied 'do' to proceed. Consistent with the precedent set for the Basic Surgical Skill dataset's analogous discrepancy, the itemized breakdown was treated as authoritative.",
      reason: "Per explicit user instruction, this dataset uses the exact per-skill counts the user provided (24 Interpretative + 25 Procedural = 49). The portal's own mapped minimums were NOT used to size this dataset - recorded in specialty-config/paediatric-surgery.json for traceability only.",
    },
    competenceLevelHandling: 'For every Procedural skill with more than one allowed competence level, individual rows use varying portal-valid levels (never multiplying row count) - see procedural_competenceLevelUsage in row-count-summary.json for the exact levels used per skill.',
    ageRealism: 'Every row uses a condition-specific paediatric age (0-10 years) rather than a generic spread - e.g. neonatal/infant age for pyloromyotomy, anorectal malformation, and temporary colostomy; toddler age for hernia/hydrocele/orchidopexy; a wider childhood age range for circumcision, abscess drainage, and lymph node biopsy.',
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
  logger.error(`generate-paediatric-surgery-dataset crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
