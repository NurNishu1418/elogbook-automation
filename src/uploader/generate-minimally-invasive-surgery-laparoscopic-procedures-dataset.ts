/**
 * Synthetic test-dataset generator for Minimally Invasive Surgery -
 * Laparoscopic Procedures (Interpretative Skill + Procedural skill).
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
 * Itemized Interpretative (3+3=6) and Procedural (5+3+1+3+3+1+3=19)
 * counts sum to 6+19=25, matching the specialty config's stated totals
 * exactly - no arithmetic discrepancy for this specialty (see
 * specialty-config/minimally-invasive-surgery-laparoscopic-procedures.json
 * -> quotaSource.arithmeticCheck).
 *
 * IMPORTANT: the portal's exact case-type label for this specialty uses
 * an EN-DASH (-), not a hyphen: "Minimally Invasive Surgery - Laparoscopic
 * procedures" (lowercase "procedures"). This was copied verbatim from
 * output/form-map.json (see the verification step in main()) into
 * CASE_TYPE_LABEL below - never retyped by hand - because a hyphen or
 * different casing would silently fail to match any leaf. This case
 * type also has two other unrelated leaves in the portal ("Clinical
 * skill", "Communication and Writing Skill") with no competency items;
 * they are irrelevant here and are not referenced by this generator.
 *
 * All generated cases are written to be appropriate to a Laparoscopic /
 * Minimally Invasive Surgical Unit, with clinically plausible adult
 * surgical ages varied per scenario (general adult surgical population,
 * not a generic flat spread).
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

const SPECIALTY_DIR = path.join(PROJECT_ROOT, 'generated-data', 'Minimally-Invasive-Surgery-Laparoscopic-Procedures');
const DATE_RANGE_LABEL = '01-01-2026_to_30-06-2026';
const DATE_RANGE_DIR = path.join(SPECIALTY_DIR, DATE_RANGE_LABEL);
const GENERATED_DIR = path.join(DATE_RANGE_DIR, 'generated');
const REPORTS_DIR = path.join(DATE_RANGE_DIR, 'reports');
const CONFIG_PATH = path.join(SPECIALTY_DIR, 'specialty-config', 'minimally-invasive-surgery-laparoscopic-procedures.json');

const DATASET_XLSX_PATH = path.join(
  GENERATED_DIR,
  'BCPS_Logbook_Minimally_Invasive_Surgery_Laparoscopic_Procedures_01-01-2026_to_30-06-2026.xlsx'
);

const FORM_LABEL = 'Procedural and Interpretative Skills';
const CASE_TYPE_LABEL = 'Minimally Invasive Surgery – Laparoscopic procedures';

const EXPECTED_INTERPRETATIVE_TOTAL = 6;
const EXPECTED_PROCEDURAL_TOTAL = 19;
const EXPECTED_GRAND_TOTAL = 25;

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
// Clinical content - concise, FCPS-logbook style, Laparoscopic /
// Minimally Invasive Surgical Unit specific. Styled after the real BCPS
// Core Surgical Training logbook (style reference only - no real patient
// names, reg numbers, dates, ages, or patient-identifiable diagnoses
// were copied). Every diagnosis is deliberately matched to the exact
// skill/procedure and to a clinically plausible adult surgical age.
// ---------------------------------------------------------------------
const INTERPRETATIVE_SCENARIOS: Record<string, InterpScenario[]> = {
  'Plain X-ray Abdomen': [
    {
      diagnosis: 'Suspected acute intestinal obstruction, preoperative work-up.',
      notes: 'Plain X-ray abdomen (erect) shows multiple dilated small bowel loops with air-fluid levels.',
      description: 'Plain X-ray abdomen for suspected intestinal obstruction.',
      targetAge: 58,
    },
    {
      diagnosis: 'Suspected perforated hollow viscus prior to diagnostic laparoscopy.',
      notes: 'Erect plain X-ray abdomen shows free gas under the right dome of the diaphragm.',
      description: 'Plain X-ray abdomen for suspected perforation prior to diagnostic laparoscopy.',
      targetAge: 41,
    },
    {
      diagnosis: 'Suspected subacute intestinal obstruction, preoperative assessment before diagnostic laparoscopy.',
      notes: 'Plain X-ray abdomen shows a few dilated bowel loops with no obvious free gas under the diaphragm.',
      description: 'Preoperative plain X-ray abdomen work-up for suspected obstruction.',
      targetAge: 55,
    },
  ],
  'USG /CT abdomen': [
    {
      diagnosis: 'Symptomatic cholelithiasis, preoperative work-up before laparoscopic cholecystectomy.',
      notes: 'USG abdomen shows multiple gallstones with a thickened gallbladder wall; common bile duct not dilated.',
      description: 'USG abdomen, pre-cholecystectomy work-up.',
      targetAge: 42,
    },
    {
      diagnosis: 'Acute appendicitis, diagnostic evaluation.',
      notes: 'USG/CT abdomen shows a non-compressible, thickened appendix with peri-appendiceal fat stranding.',
      description: 'USG/CT abdomen for suspected acute appendicitis.',
      targetAge: 24,
    },
    {
      diagnosis: 'Inguinal hernia, preoperative evaluation before laparoscopic hernioplasty.',
      notes: "USG abdomen and groin confirms a reducible inguinal hernia with bowel loops within the sac.",
      description: 'USG abdomen for inguinal hernia evaluation.',
      targetAge: 51,
    },
  ],
};

const PROCEDURAL_SCENARIOS: Record<string, ProcScenario[]> = {
  'Closed and open techniques for port creation and closure': [
    {
      diagnosis: 'Symptomatic cholelithiasis requiring laparoscopic cholecystectomy.',
      notes:
        "Primary port created at the umbilicus using the open (Hasson) technique, with the closed Veress needle technique used for the remaining working ports; all port sites closed in layers at the end of the procedure.",
      description: 'Port access and closure for laparoscopic cholecystectomy.',
      targetAge: 40,
      level: '2',
    },
    {
      diagnosis: 'Acute abdomen of uncertain cause requiring diagnostic laparoscopy.',
      notes:
        "Pneumoperitoneum established by the closed Veress needle technique at Palmer's point, followed by an open cut-down for the primary port; all ports closed securely on completion.",
      description: 'Port access and closure for diagnostic laparoscopy.',
      targetAge: 33,
      level: '3',
    },
    {
      diagnosis: 'Acute appendicitis requiring laparoscopic appendicectomy.',
      notes:
        'Primary umbilical port created by the open technique, with the closed technique used for the two working ports; fascial defects closed under direct vision at the end of the procedure.',
      description: 'Port access and closure for laparoscopic appendicectomy.',
      targetAge: 22,
      level: '2',
    },
    {
      diagnosis: 'Inguinal hernia requiring laparoscopic hernia repair.',
      notes: 'Ports created using the open technique at the umbilicus and the closed technique for the two lateral working ports; all port sites closed in layers.',
      description: 'Port access and closure for laparoscopic hernia repair.',
      targetAge: 55,
      level: '3',
    },
    {
      diagnosis: 'Intraoperative bleeding requiring laparoscopic control.',
      notes: 'An additional working port created using the closed technique to gain rapid access for control of bleeding; all ports closed securely at the end of the procedure.',
      description: 'Port access and closure for laparoscopic control of bleeding.',
      targetAge: 47,
      level: '2',
    },
  ],
  'Diagnostic laparoscopy': [
    {
      diagnosis: 'Acute abdomen of uncertain cause.',
      notes: 'Diagnostic laparoscopy performed and revealed localized peritonitis; findings guided the subsequent definitive procedure.',
      description: 'Diagnostic laparoscopy for acute abdomen of uncertain cause.',
      targetAge: 36,
      level: '2',
    },
    {
      diagnosis: 'Suspected acute appendicitis in a female patient, requiring exclusion of a gynaecological cause.',
      notes: 'Diagnostic laparoscopy performed; appendix found inflamed with normal ovaries and fallopian tubes, excluding a gynaecological cause.',
      description: 'Diagnostic laparoscopy to exclude a gynaecological cause of suspected appendicitis.',
      targetAge: 27,
      level: '3',
    },
    {
      diagnosis: 'Chronic abdominal pain of uncertain aetiology.',
      notes: 'Diagnostic laparoscopy performed with systematic examination of the peritoneal cavity; no significant pathology identified.',
      description: 'Diagnostic laparoscopy for chronic abdominal pain of uncertain aetiology.',
      targetAge: 44,
      level: '2',
    },
  ],
  'Laparoscopic appendicectomy': [
    {
      diagnosis: 'Acute appendicitis.',
      notes: 'Laparoscopic appendicectomy performed with the mesoappendix and appendicular base secured using endoloops; appendix retrieved in an endobag.',
      description: 'Laparoscopic appendicectomy for acute appendicitis.',
      targetAge: 21,
      level: '1',
    },
  ],
  'Laparoscopic cholecystectomy': [
    {
      diagnosis: 'Symptomatic cholelithiasis.',
      notes: "Laparoscopic cholecystectomy performed with a critical view of safety achieved before clipping and dividing the cystic duct and artery.",
      description: 'Laparoscopic cholecystectomy for symptomatic cholelithiasis.',
      targetAge: 38,
      level: '1',
    },
    {
      diagnosis: 'Chronic calculous cholecystitis.',
      notes: "Laparoscopic cholecystectomy performed with dense adhesions at the gallbladder fundus released prior to dissection of Calot's triangle.",
      description: 'Laparoscopic cholecystectomy for chronic calculous cholecystitis.',
      targetAge: 50,
      level: '2',
    },
    {
      diagnosis: 'Recurrent biliary colic due to cholelithiasis.',
      notes: 'Laparoscopic cholecystectomy performed uneventfully with the gallbladder delivered through the umbilical port site.',
      description: 'Laparoscopic cholecystectomy for recurrent biliary colic.',
      targetAge: 45,
      level: '1',
    },
  ],
  'Laparoscopic control of bleeding': [
    {
      diagnosis: 'Intraoperative bleeding from the cystic artery during a laparoscopic procedure.',
      notes: 'Bleeding from a slipped cystic artery clip controlled laparoscopically by re-application of clips after adequate exposure.',
      description: 'Laparoscopic control of intraoperative bleeding.',
      targetAge: 41,
      level: '2',
    },
    {
      diagnosis: 'Bleeding duodenal ulcer amenable to laparoscopic control.',
      notes: 'Bleeding duodenal ulcer controlled laparoscopically by under-running the bleeding vessel with intracorporeal sutures.',
      description: 'Laparoscopic control of bleeding duodenal ulcer.',
      targetAge: 58,
      level: '3',
    },
    {
      diagnosis: 'Bleeding from the gallbladder bed during laparoscopic cholecystectomy.',
      notes: 'Oozing from the gallbladder bed controlled laparoscopically using bipolar diathermy and application of a haemostatic agent.',
      description: 'Laparoscopic control of bleeding from the gallbladder bed.',
      targetAge: 49,
      level: '2',
    },
  ],
  'Laparoscopic hernioplasty (TAPP & TEP)': [
    {
      diagnosis: 'Inguinal hernia.',
      notes: 'Laparoscopic transabdominal preperitoneal (TAPP) hernioplasty performed with reduction of the hernial sac and placement of a mesh over the myopectineal orifice.',
      description: 'Laparoscopic hernioplasty (TAPP) for inguinal hernia.',
      targetAge: 52,
      level: '2',
    },
  ],
  'Laparoscopic suturing and knotting': [
    {
      diagnosis: 'Perforated peptic ulcer requiring intracorporeal suturing.',
      notes: 'Laparoscopic repair of a perforated duodenal ulcer performed using intracorporeal suturing and knotting with an omental patch reinforcement.',
      description: 'Laparoscopic suturing and knotting for repair of a perforated peptic ulcer.',
      targetAge: 46,
      level: '3',
    },
    {
      diagnosis: 'Closure of the appendicular stump following laparoscopic appendicectomy.',
      notes: 'Appendicular stump closed with intracorporeal suturing and knotting after the endoloop ligature appeared insecure.',
      description: 'Laparoscopic suturing and knotting for closure of the appendicular stump.',
      targetAge: 25,
      level: '2',
    },
    {
      diagnosis: 'Iatrogenic bowel injury identified during a laparoscopic procedure, requiring repair.',
      notes: 'Small bowel injury repaired laparoscopically using intracorporeal suturing and knotting in two layers.',
      description: 'Laparoscopic suturing and knotting for repair of an iatrogenic bowel injury.',
      targetAge: 39,
      level: '3',
    },
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

// General adult surgical population - both male and female conditions are
// well represented in this specialty (cholecystectomy, hernia, appendix,
// diagnostic laparoscopy for uncertain-cause/gynaecological exclusion), so
// the name pool is not gender-skewed.
function buildUniqueNamePool(count: number, seed: number): string[] {
  const names = new Set<string>();
  const firsts = shuffle([...MALE_FIRST, ...FEMALE_FIRST], seed);
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
        externalRowId: `MIS-${(globalIndex + 1).toString().padStart(3, '0')}`,
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
        externalRowId: `MIS-${(globalIndex + 1).toString().padStart(3, '0')}`,
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
  logger.info('Generating Minimally Invasive Surgery - Laparoscopic Procedures dataset (USER-PROVIDED EXACT COUNTS, dry-run only).');

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
  logger.info(`All 9 configured skills matched exactly to the mapped portal data (${labelDifferences.length} label difference(s) found), and all requested competence levels are portal-valid.`);

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
    `Total rows planned (USER-PROVIDED EXACT COUNTS, itemized breakdown - see quotaSource in config): ${totalRowsPlanned} (Interpretative=${interpPlanned}, Procedural=${procPlanned})`
  );

  const namePool = buildUniqueNamePool(totalRowsPlanned, 51515);
  const regNoPool = buildUniqueRegNos(totalRowsPlanned, 62626);

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
    JSON.stringify({ generatedAt: new Date().toISOString(), totalSkillsRequested: 9, totalSkillsMatched: 9, unmatchedSkills: unmatched, labelDifferences, levelMismatches }, null, 2),
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
    specialty: 'Minimally Invasive Surgery – Laparoscopic Procedures',
    trainingContext: 'Laparoscopic / Minimally Invasive Surgical Unit',
    dateRange: { label: DATE_RANGE_LABEL, from: '2026-01-01', to: '2026-06-30' },
    datasetWorkbook: DATASET_XLSX_PATH,
    quotaDecision: {
      countSource: 'USER_PROVIDED_EXACT_COUNTS_ITEMIZED',
      portalQuotaUsedToSizeDataset: false,
      arithmeticCheck: 'Itemized Interpretative (3+3=6) and Procedural (5+3+1+3+3+1+3=19) sum to 6+19=25, matching the specialty config totals exactly - no discrepancy for this specialty.',
      reason: "Per explicit instruction, this dataset uses the exact per-skill counts supplied in the specialty config (6 Interpretative + 19 Procedural = 25). The portal's own mapped minimums were NOT used to size this dataset - recorded in specialty-config/minimally-invasive-surgery-laparoscopic-procedures.json for traceability only.",
    },
    competenceLevelHandling: 'For every Procedural skill with more than one allowed competence level, individual rows use varying portal-valid levels (never multiplying row count) - see procedural_competenceLevelUsage in row-count-summary.json for the exact levels used per skill.',
    ageRealism: 'Every row uses a clinically plausible adult surgical age for the specific diagnosis/procedure (general adult surgical population), rather than a generic flat age spread.',
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
  logger.error(`generate-minimally-invasive-surgery-laparoscopic-procedures-dataset crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
