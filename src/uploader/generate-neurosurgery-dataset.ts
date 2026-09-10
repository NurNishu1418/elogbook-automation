/**
 * Synthetic test-dataset generator for Neurosurgery (Interpretative Skill +
 * Procedural skill).
 *
 * UNLIKE the Gastrointestinal and Disorders-of-the-Breast generators, this
 * dataset uses the USER'S EXACT PROVIDED COUNTS as the sole authority for
 * row counts (7 Interpretative + 4 Procedural = 11) - per explicit
 * instruction, the portal's own mapped minimums are NOT used to size this
 * dataset, and are recorded only for traceability in the specialty config.
 * The live portal IS still used (read-only, via output/form-map.json) to
 * verify exact skill names, field schemas, and valid competence levels -
 * never fabricated.
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

const SPECIALTY_DIR = path.join(PROJECT_ROOT, 'generated-data', 'Neurosurgery');
const DATE_RANGE_LABEL = '01-01-2026_to_30-06-2026';
const DATE_RANGE_DIR = path.join(SPECIALTY_DIR, DATE_RANGE_LABEL);
const GENERATED_DIR = path.join(DATE_RANGE_DIR, 'generated');
const REPORTS_DIR = path.join(DATE_RANGE_DIR, 'reports');
const CONFIG_PATH = path.join(SPECIALTY_DIR, 'specialty-config', 'neurosurgery.json');

const DATASET_XLSX_PATH = path.join(GENERATED_DIR, 'BCPS_Logbook_Neurosurgery_01-01-2026_to_30-06-2026.xlsx');

const FORM_LABEL = 'Procedural and Interpretative Skills';
const CASE_TYPE_LABEL = 'Neurosurgery';

interface Scenario {
  diagnosis: string;
  notes: string;
  description: string;
  /** Clinically appropriate completed age (years) for this specific diagnosis/procedure, not a generic cycling value. */
  targetAge: number;
}

// ---------------------------------------------------------------------
// Clinical content - concise, FCPS-logbook style, neurosurgery-specific.
// Styled after the real BCPS Core Surgical Training logbook (style
// reference only - no real patient names, reg numbers, dates, ages, or
// patient-identifiable diagnoses were copied). Each scenario carries a
// targetAge chosen for clinical plausibility (e.g. chronic subdural
// hematoma skews elderly, meningocoele repair is a neonatal/infant
// procedure) rather than a generic age spread.
// ---------------------------------------------------------------------
const INTERPRETATIVE_SCENARIOS: Record<string, Scenario[]> = {
  'CT/MRI /MRA of brain': [
    { diagnosis: 'Head injury.', notes: 'CT brain shows no acute intracranial hemorrhage.', description: 'CT brain for head injury.', targetAge: 24 },
    { diagnosis: 'Intracranial space-occupying lesion.', notes: 'MRI brain shows a well-defined enhancing mass, likely meningioma.', description: 'MRI brain for suspected space-occupying lesion.', targetAge: 52 },
    { diagnosis: 'Suspected cerebral vascular lesion.', notes: 'MRA shows an anterior communicating artery aneurysm.', description: 'MRA brain for suspected vascular lesion.', targetAge: 57 },
  ],
  'Nerve conduction study': [
    { diagnosis: 'Suspected ulnar neuropathy.', notes: 'Nerve conduction study shows reduced conduction velocity across the elbow segment, consistent with ulnar entrapment.', description: 'Nerve conduction study for suspected ulnar neuropathy.', targetAge: 38 },
  ],
  'X-ray skull': [
    { diagnosis: 'Head injury.', notes: 'X-ray skull shows no obvious fracture line.', description: 'X-ray skull for head injury.', targetAge: 26 },
    { diagnosis: 'Suspected skull fracture.', notes: 'X-ray skull shows a linear fracture over the parietal bone.', description: 'X-ray skull for suspected fracture.', targetAge: 31 },
    { diagnosis: 'Depressed skull fracture.', notes: 'X-ray skull shows a depressed fracture fragment over the frontal region.', description: 'X-ray skull for depressed fracture.', targetAge: 29 },
  ],
};

const PROCEDURAL_SCENARIOS: Record<string, Scenario[]> = {
  'Burr hole': [
    { diagnosis: 'Chronic subdural hematoma.', notes: 'Burr hole evacuation of chronic subdural hematoma done under local anesthesia, drain placed.', description: 'Burr hole for chronic subdural hematoma.', targetAge: 68 },
  ],
  Craniotomy: [
    { diagnosis: 'Intracranial space-occupying lesion.', notes: 'Craniotomy and excision of intracranial mass performed, hemostasis secured.', description: 'Craniotomy for intracranial space-occupying lesion.', targetAge: 49 },
  ],
  'Repair of meningocoele': [
    { diagnosis: 'Lumbosacral meningocoele.', notes: 'Repair of lumbosacral meningocoele done with layered closure of the defect.', description: 'Repair of meningocoele.', targetAge: 0 },
  ],
  'Repair of peripheral nerves': [
    { diagnosis: 'Ulnar nerve injury.', notes: 'Repair of ulnar nerve done with epineural suturing under magnification.', description: 'Repair of peripheral nerve (ulnar).', targetAge: 34 },
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
        const dates = buildAssignmentDates(levelDef.count, 4000 + globalIndex);
        for (let i = 0; i < levelDef.count; i++) {
          if (scenarioCursor >= bank.length) throw new Error(`Not enough authored scenarios for "${skill.name}" - need ${skill.levels.reduce((s, l) => s + l.count, 0)}, have ${bank.length}.`);
          const scenario = bank[scenarioCursor];
          scenarioCursor++;
          const targetAge = scenario.targetAge;
          let { dob, verifiedAge } = computeVerifiedDob(dates[i], targetAge, 12000 + globalIndex);
          if (verifiedAge !== targetAge) {
            let fixed = computeVerifiedDob(dates[i], targetAge, 13000 + globalIndex);
            let attempts = 0;
            while (fixed.verifiedAge !== targetAge && attempts < 20) {
              fixed = computeVerifiedDob(dates[i], targetAge, 14000 + globalIndex + attempts);
              attempts++;
            }
            if (fixed.verifiedAge !== targetAge) {
              throw new Error(`Could not generate a matching DOB/Age pair for row ${globalIndex} (target age ${targetAge}, date ${dates[i]}).`);
            }
            dob = fixed.dob;
            verifiedAge = fixed.verifiedAge;
          }

          rows.push({
            externalRowId: `NSX-${(globalIndex + 1).toString().padStart(3, '0')}`,
            skillType,
            competencyItem: skill.name,
            competenceLevel: levelDef.level,
            patientName: namePool[globalIndex],
            patientRegNo: regNoPool[globalIndex],
            dateOfAssignment: dates[i],
            dateOfBirth: dob,
            age: verifiedAge,
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
  logger.info('Generating Neurosurgery dataset (USER-PROVIDED EXACT COUNTS, dry-run only).');

  const realWorkbookStatBefore = fs.statSync(REAL_XLSX_PATH);
  const basicSurgicalDir = path.join(PROJECT_ROOT, 'generated-data', 'Basic-Surgical-Skill');
  const basicSurgicalFilesBefore = fs.readdirSync(basicSurgicalDir).sort();
  const giDir = path.join(PROJECT_ROOT, 'generated-data', 'Gastrointestinal-HepatoBiliary-Pancreas');
  const giFilesBefore = JSON.stringify(walkDir(giDir));
  const breastDir = path.join(PROJECT_ROOT, 'generated-data', 'Disorders-of-the-Breast');
  const breastFilesBefore = JSON.stringify(walkDir(breastDir));

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
  const levelMismatches: { skillType: string; name: string; requestedLevel: string | null; validLevels: (string | null)[] }[] = [];
  for (const skillType of ['Interpretative Skill', 'Procedural skill'] as const) {
    const leaf = leaves.find((l) => l.pathLabels.join(' > ') === `${FORM_LABEL} > ${CASE_TYPE_LABEL} > ${skillType}`);
    for (const skill of config.skills[skillType]) {
      const competency = leaf?.competencyGroup.find((c) => c.particulars.trim() === skill.name.trim());
      if (!competency) {
        unmatched.push({ skillType, name: skill.name });
        continue;
      }
      const validLevels: (string | null)[] = (competency as any).log_entry_target
        ? (competency as any).log_entry_target.map((t: any) => t.compitency_level)
        : [null];
      for (const levelDef of skill.levels) {
        if (!validLevels.includes(levelDef.level)) {
          levelMismatches.push({ skillType, name: skill.name, requestedLevel: levelDef.level, validLevels });
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
  logger.info('All 7 configured skills matched exactly to the mapped portal data, and all requested competence levels are portal-valid.');

  const totalRowsPlanned =
    config.skills['Interpretative Skill'].reduce((s, sk) => s + sk.levels.reduce((a, l) => a + l.count, 0), 0) +
    config.skills['Procedural skill'].reduce((s, sk) => s + sk.levels.reduce((a, l) => a + l.count, 0), 0);
  if (totalRowsPlanned !== 11) {
    logger.error(`Config total (${totalRowsPlanned}) does not equal the required exact total of 11. STOP.`);
    process.exit(1);
  }
  logger.info(`Total rows planned (USER-PROVIDED EXACT COUNT, not portal quota): ${totalRowsPlanned}`);

  const namePool = buildUniqueNamePool(totalRowsPlanned, 7171);
  const regNoPool = buildUniqueRegNos(totalRowsPlanned, 8282);

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
  for (const skillType of ['Interpretative Skill', 'Procedural skill'] as const) {
    for (const skill of config.skills[skillType]) {
      const requested = skill.levels.reduce((s, l) => s + l.count, 0);
      const actual = rows.filter((r) => r.skillType === skillType && r.competencyItem === skill.name).length;
      perSkillCounts[`${skillType} > ${skill.name}`] = { requested, actual };
    }
  }
  const perLevelCounts = config.skills['Procedural skill'].flatMap((skill) =>
    skill.levels.map((levelDef) => ({
      skillType: 'Procedural skill' as const,
      skill: skill.name,
      level: levelDef.level,
      requested: levelDef.count,
      actual: rows.filter((r) => r.skillType === 'Procedural skill' && r.competencyItem === skill.name && r.competenceLevel === levelDef.level).length,
    }))
  );

  const interpTotal = rows.filter((r) => r.skillType === 'Interpretative Skill').length;
  const procTotal = rows.filter((r) => r.skillType === 'Procedural skill').length;

  fs.writeFileSync(
    path.join(REPORTS_DIR, 'row-count-summary.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), totalRows: rows.length, interpretativeTotal: interpTotal, proceduralTotal: procTotal, perSkill: perSkillCounts, perCompetenceLevel: perLevelCounts }, null, 2),
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
    JSON.stringify({ generatedAt: new Date().toISOString(), totalSkillsRequested: 7, totalSkillsMatched: 7, unmatchedSkills: unmatched, levelMismatches }, null, 2),
    'utf-8'
  );

  const realWorkbookStatAfter = fs.statSync(REAL_XLSX_PATH);
  const originalWorkbookUnchanged = realWorkbookStatBefore.size === realWorkbookStatAfter.size && realWorkbookStatBefore.mtimeMs === realWorkbookStatAfter.mtimeMs;
  const basicSurgicalFilesAfter = fs.readdirSync(basicSurgicalDir).sort();
  const basicSurgicalUnchanged = JSON.stringify(basicSurgicalFilesBefore) === JSON.stringify(basicSurgicalFilesAfter);
  const giFilesAfter = JSON.stringify(walkDir(giDir));
  const giUnchanged = giFilesBefore === giFilesAfter;
  const breastFilesAfter = JSON.stringify(walkDir(breastDir));
  const breastUnchanged = breastFilesBefore === breastFilesAfter;

  const generationSummary = {
    generatedAt: new Date().toISOString(),
    specialty: 'Neurosurgery',
    dateRange: { label: DATE_RANGE_LABEL, from: '2026-01-01', to: '2026-06-30' },
    datasetWorkbook: DATASET_XLSX_PATH,
    quotaDecision: {
      countSource: 'USER_PROVIDED_EXACT_COUNTS',
      portalQuotaUsedToSizeDataset: false,
      reason: 'Per explicit user instruction, this dataset uses the exact counts the user provided (Interpretative: CT/MRI/MRA of brain=3, Nerve conduction study=1, X-ray skull=3; Procedural: Burr hole=1, Craniotomy=1, Repair of meningocoele=1, Repair of peripheral nerves=1). The portal’s own mapped minimums (5/2/5 Interpretative, 1+1 per level Procedural) were NOT used to size this dataset - they are recorded in specialty-config/neurosurgery.json for traceability only.',
    },
    competenceLevelHandling: 'Each of the 4 Procedural skills has 2 portal-valid competence levels (1 and 2), but the user required exactly 1 row per skill - the level was NOT multiplied into extra rows. One portal-valid level was selected per skill (Burr hole=1, Craniotomy=2, Repair of meningocoele=1, Repair of peripheral nerves=2) to vary level usage realistically across the 4 rows.',
    totals: { interpretative: interpTotal, procedural: procTotal, grandTotal: rows.length },
    skillsGenerated: Object.entries(perSkillCounts).map(([k, v]) => ({ skill: k, requested: v.requested, actual: v.actual, matches: v.requested === v.actual })),
    unmatchedSkills: unmatched,
    levelMismatches,
    liveActionsTaken: 'None. This generator only reads the existing local output/form-map.json (produced by a prior, already-approved live mapping crawl) - no login, browser, or network action was performed by this script. No Save as Draft, no Final Submit, no portal data modified.',
    originalMappingWorkbookUnchanged: originalWorkbookUnchanged,
    basicSurgicalSkillDatasetUnchanged: basicSurgicalUnchanged,
    gastrointestinalDatasetUnchanged: giUnchanged,
    disordersOfTheBreastDatasetUnchanged: breastUnchanged,
    reviewStatus: 'PENDING MANUAL REVIEW',
    uploadStatus: 'NOT UPLOADED',
  };
  fs.writeFileSync(path.join(REPORTS_DIR, 'generation-summary.json'), JSON.stringify(generationSummary, null, 2), 'utf-8');
  fs.writeFileSync(path.join(REPORTS_DIR, 'generated-rows-raw.json'), JSON.stringify(rows, null, 2), 'utf-8');

  logger.info(`Wrote all report files to ${REPORTS_DIR}`);
  logger.info(
    `originalMappingWorkbookUnchanged=${originalWorkbookUnchanged}, basicSurgicalSkillDatasetUnchanged=${basicSurgicalUnchanged}, gastrointestinalDatasetUnchanged=${giUnchanged}, disordersOfTheBreastDatasetUnchanged=${breastUnchanged}`
  );
  logger.info('STOPPED after dry-run validation, as instructed. No login/browser/draft action was performed by this generator.');
}

main().catch((err) => {
  logger.error(`generate-neurosurgery-dataset crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
