/**
 * NEW, non-destructive Abdominal Wall dataset build, compatible with the
 * CURRENT auto-script's exact DataEntry schema (13 columns, header names
 * matched exactly to what excelReader.ts actually looks for - notably
 * "CompetencyItemsChecked (semicolon-separated)", not the plain name used
 * in the earlier 2026-09-10 blank templates, which was a real mismatch
 * discovered while preparing this file).
 *
 * NEVER overwrites any existing file. Reads existing workbooks under
 * generated-data/2026-09-10 and generated-data/Abdominal-Wall only as
 * read-only structural/style reference (confirmed: same leaf ids, same
 * counts/levels as the existing specialty-config/abdominal-wall.json).
 * Every clinical row here is freshly authored, not copied from the older
 * dataset.
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'generated-data', '2026-09-10');

const INTERPRETATIVE_LEAF_ID = '99a06d89-5e3f-4a58-b234-502e7ce20200';
const PROCEDURAL_LEAF_ID = '8d16daad-9b8e-46bc-aed3-ea7c72875674';

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

interface InterpRow {
  externalRowId: string;
  assignmentDate: string;
  patientName: string;
  regNo: string;
  dob: string;
  indication: string;
  interpretation: string;
  briefDescription: string;
}
interface ProcRow {
  externalRowId: string;
  assignmentDate: string;
  patientName: string;
  regNo: string;
  dob: string;
  skill: string;
  level: string;
  diagnosis: string;
  notes: string;
  briefDescription: string;
  level5Hold: boolean;
}

function completedAge(dobIso: string, assignIso: string): number {
  const dob = new Date(dobIso + 'T00:00:00Z');
  const assign = new Date(assignIso + 'T00:00:00Z');
  let age = assign.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = assign.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && assign.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

// ---------------------------------------------------------------------
// Freshly authored clinical content (not copied from the older
// generated-data/Abdominal-Wall dataset). Every Interpretative row's
// three fields describe the SAME investigation/case; every Procedural
// row's Diagnosis/Notes/Description describe the SAME operative case.
// ---------------------------------------------------------------------

const interpretativeRows: Omit<InterpRow, 'externalRowId' | 'assignmentDate' | 'patientName' | 'regNo' | 'dob'>[] = [
  {
    indication: 'Painful swelling at a previous lower-midline laparotomy scar; ultrasound of the abdominal wall performed to assess for suspected incisional hernia.',
    interpretation: 'Ultrasound demonstrated a fascial defect at the site of the previous scar with herniation of preperitoneal fat, confirming an incisional hernia.',
    briefDescription: 'Ultrasound of the abdominal wall for suspected incisional hernia.',
  },
  {
    indication: 'Recurrent abdominal-wall bulge at a previous mesh hernioplasty site; CT scan of the abdominal wall performed to assess for recurrence.',
    interpretation: 'CT scan showed a recurrent fascial defect immediately adjacent to the previous mesh, with a small bowel loop within the hernial sac.',
    briefDescription: 'CT scan of the abdominal wall for suspected recurrent hernia.',
  },
  {
    indication: 'Large ventral hernia with clinically apparent loss of abdominal domain; MRI of the abdominal wall performed for preoperative planning prior to a planned component separation repair.',
    interpretation: 'MRI delineated a wide musculofascial defect with significant loss of domain, supporting the plan for component separation to achieve tension-free closure.',
    briefDescription: 'MRI of the abdominal wall for preoperative evaluation before planned component separation repair.',
  },
];

const proceduralRows: Omit<ProcRow, 'externalRowId' | 'assignmentDate' | 'patientName' | 'regNo' | 'dob'>[] = [
  {
    skill: 'Component separation techniques',
    level: '1',
    level5Hold: false,
    diagnosis: 'Large complex incisional hernia with a wide fascial defect and loss of abdominal domain.',
    notes: 'Component separation performed to mobilize the abdominal-wall musculofascial layers bilaterally, achieving tension-free approximation of the wide midline defect.',
    briefDescription: 'Component separation technique performed for a large complex incisional hernia with loss of domain.',
  },
  {
    skill: 'IPOM/ IPOM plus',
    level: '2',
    level5Hold: false,
    diagnosis: 'Symptomatic incisional hernia following a previous appendicectomy.',
    notes: 'Laparoscopic IPOM plus repair performed with adhesiolysis, defect closure, and intraperitoneal mesh placement with adequate overlap and secure fixation.',
    briefDescription: 'IPOM plus repair performed for symptomatic incisional hernia after previous appendicectomy.',
  },
  {
    skill: 'IPOM/ IPOM plus',
    level: '2',
    level5Hold: false,
    diagnosis: 'Symptomatic ventral hernia with a moderate-sized fascial defect.',
    notes: 'Abdominal-wall defect assessed laparoscopically, hernial contents reduced, and intraperitoneal mesh positioned with adequate overlap and fixation.',
    briefDescription: 'IPOM repair performed for symptomatic ventral hernia.',
  },
  {
    skill: 'Open and laparoscopic repair of incisional hernia',
    level: '1',
    level5Hold: false,
    diagnosis: 'Symptomatic incisional hernia at a previous lower-midline laparotomy scar.',
    notes: 'Hernial sac contents reduced and the incisional fascial defect repaired by the open technique with mesh reinforcement.',
    briefDescription: 'Open repair of symptomatic incisional hernia.',
  },
  {
    skill: 'Open and laparoscopic repair of inguinal hernia',
    level: '5',
    level5Hold: true,
    diagnosis: 'Symptomatic right inguinal hernia.',
    notes: 'Open inguinal hernia repair performed with reduction of the hernial sac and reinforcement of the posterior inguinal wall by mesh hernioplasty.',
    briefDescription: 'Open repair of symptomatic right inguinal hernia.',
  },
  {
    skill: 'Open and laparoscopic repair of inguinal hernia',
    level: '5',
    level5Hold: true,
    diagnosis: 'Symptomatic left inguinal hernia.',
    notes: 'Laparoscopic (TEP) inguinal hernia repair performed with reduction of the hernial sac and mesh placement over the myopectineal orifice.',
    briefDescription: 'Laparoscopic repair of symptomatic left inguinal hernia.',
  },
  {
    skill: 'Open and laparoscopic repair of inguinal hernia',
    level: '5',
    level5Hold: true,
    diagnosis: 'Symptomatic bilateral inguinal hernia.',
    notes: 'Bilateral inguinal hernia repair performed with reduction of both hernial sacs and bilateral mesh hernioplasty.',
    briefDescription: 'Repair of symptomatic bilateral inguinal hernia.',
  },
  {
    skill: 'Open and laparoscopic repair of paraumbilical hernia',
    level: '2',
    level5Hold: false,
    diagnosis: 'Symptomatic paraumbilical hernia.',
    notes: 'Paraumbilical hernia sac dissected, contents reduced, and the fascial defect repaired with mesh reinforcement.',
    briefDescription: 'Open repair of symptomatic paraumbilical hernia.',
  },
  {
    skill: 'Open and laparoscopic repair of paraumbilical hernia',
    level: '2',
    level5Hold: false,
    diagnosis: 'Symptomatic paraumbilical hernia with a moderate fascial defect.',
    notes: 'Hernial contents reduced and the paraumbilical fascial defect closed with onlay mesh reinforcement.',
    briefDescription: 'Repair of symptomatic paraumbilical hernia with mesh reinforcement.',
  },
  {
    skill: 'Open and laparoscopic repair of recurrent hernia',
    level: '1',
    level5Hold: false,
    diagnosis: 'Recurrent ventral hernia after a previous mesh repair.',
    notes: 'Recurrent fascial defect identified adjacent to the previous mesh; hernial contents reduced and the defect repaired with wide mesh overlap.',
    briefDescription: 'Repair of recurrent ventral hernia after previous mesh repair.',
  },
  {
    skill: 'Open and laparoscopic repair of umbilical hernia',
    level: '1',
    level5Hold: false,
    diagnosis: 'Symptomatic umbilical hernia.',
    notes: 'Umbilical hernia sac dissected, contents reduced, and the fascial defect repaired with mesh reinforcement.',
    briefDescription: 'Open repair of symptomatic umbilical hernia.',
  },
];

const PATIENT_NAMES = [
  'Md. Kamal Hossain',
  'Rahima Begum',
  'Abdul Karim',
  'Nasrin Akter',
  'Mohammad Arif Hasan',
  'Farzana Yasmin',
  'Md. Zahirul Islam',
  'Salma Khatun',
  'Tanvir Ahmed',
  'Sharmin Sultana',
  'Golam Rabbani',
  'Rokeya Chowdhury',
  'Habibur Rahman Miah',
  'Shirin Aktar',
];

const REG_NOS = ['4267/24', '6587/35', '1732/01', '8241/76', '5390/48', '2984/17', '7156/62', '3820/09', '9047/53', '6612/28', '1489/71', '8203/36', '5567/19', '2740/84'];

const DOBS = [
  '1974-01-25',
  '1965-02-11',
  '1978-05-24',
  '1970-03-14',
  '1968-08-02',
  '1962-11-19',
  '1980-04-07',
  '1955-06-30',
  '1985-09-12',
  '1972-07-21',
  '1958-01-05',
  '1990-02-27',
  '1966-10-16',
  '1975-12-03',
];

const ASSIGNMENT_DATES = [
  '2026-01-28',
  '2026-06-18',
  '2026-05-26',
  '2026-02-14',
  '2026-01-09',
  '2026-03-22',
  '2026-04-30',
  '2026-06-05',
  '2026-02-27',
  '2026-05-11',
  '2026-03-08',
  '2026-04-16',
  '2026-06-24',
  '2026-01-19',
];

function buildRows() {
  const allInterp: InterpRow[] = interpretativeRows.map((r, i) => ({
    ...r,
    externalRowId: `AW2-INT-${String(i + 1).padStart(3, '0')}`,
    assignmentDate: ASSIGNMENT_DATES[i],
    patientName: PATIENT_NAMES[i],
    regNo: REG_NOS[i],
    dob: DOBS[i],
  }));

  const allProc: ProcRow[] = proceduralRows.map((r, i) => {
    const idx = i + interpretativeRows.length;
    return {
      ...r,
      externalRowId: `AW2-PROC-${String(i + 1).padStart(3, '0')}`,
      assignmentDate: ASSIGNMENT_DATES[idx],
      patientName: PATIENT_NAMES[idx],
      regNo: REG_NOS[idx],
      dob: DOBS[idx],
    };
  });

  return { allInterp, allProc };
}

function validate(allInterp: InterpRow[], allProc: ProcRow[]): string[] {
  const errors: string[] = [];

  const names = [...allInterp.map((r) => r.patientName), ...allProc.map((r) => r.patientName)];
  if (new Set(names).size !== names.length) errors.push('Duplicate patient name found.');

  const regNos = [...allInterp.map((r) => r.regNo), ...allProc.map((r) => r.regNo)];
  if (new Set(regNos).size !== regNos.length) errors.push('Duplicate Patient Reg No found.');
  for (const r of regNos) {
    if (!/^\d{4}\/\d{2}$/.test(r)) errors.push(`Reg No "${r}" does not match ####/## format.`);
  }

  const externalIds = [...allInterp.map((r) => r.externalRowId), ...allProc.map((r) => r.externalRowId)];
  if (new Set(externalIds).size !== externalIds.length) errors.push('Duplicate ExternalRowId found.');

  for (const r of [...allInterp, ...allProc]) {
    const dob = new Date(r.dob + 'T00:00:00Z');
    const assign = new Date(r.assignmentDate + 'T00:00:00Z');
    if (dob.getTime() >= assign.getTime()) errors.push(`Row ${r.externalRowId}: DOB is not before Date of Assignment.`);
    const rangeStart = new Date('2026-01-01T00:00:00Z');
    const rangeEnd = new Date('2026-06-30T00:00:00Z');
    if (assign.getTime() < rangeStart.getTime() || assign.getTime() > rangeEnd.getTime()) {
      errors.push(`Row ${r.externalRowId}: Date of Assignment ${r.assignmentDate} is outside 2026-01-01..2026-06-30.`);
    }
    const age = completedAge(r.dob, r.assignmentDate);
    if (age < 18 || age > 90) errors.push(`Row ${r.externalRowId}: calculated age ${age} is not clinically plausible for an adult hernia case.`);
  }

  if (allInterp.length !== 3) errors.push(`Expected 3 Interpretative rows, got ${allInterp.length}.`);
  if (allProc.length !== 11) errors.push(`Expected 11 Procedural rows, got ${allProc.length}.`);

  const expectedProcCounts: Record<string, number> = {
    'Component separation techniques': 1,
    'IPOM/ IPOM plus': 2,
    'Open and laparoscopic repair of incisional hernia': 1,
    'Open and laparoscopic repair of inguinal hernia': 3,
    'Open and laparoscopic repair of paraumbilical hernia': 2,
    'Open and laparoscopic repair of recurrent hernia': 1,
    'Open and laparoscopic repair of umbilical hernia': 1,
  };
  const expectedLevels: Record<string, string> = {
    'Component separation techniques': '1',
    'IPOM/ IPOM plus': '2',
    'Open and laparoscopic repair of incisional hernia': '1',
    'Open and laparoscopic repair of inguinal hernia': '5',
    'Open and laparoscopic repair of paraumbilical hernia': '2',
    'Open and laparoscopic repair of recurrent hernia': '1',
    'Open and laparoscopic repair of umbilical hernia': '1',
  };
  const actualCounts: Record<string, number> = {};
  for (const r of allProc) {
    actualCounts[r.skill] = (actualCounts[r.skill] ?? 0) + 1;
    if (r.level !== expectedLevels[r.skill]) errors.push(`Row ${r.externalRowId}: skill "${r.skill}" has level ${r.level}, expected ${expectedLevels[r.skill]}.`);
  }
  for (const [skill, count] of Object.entries(expectedProcCounts)) {
    if (actualCounts[skill] !== count) errors.push(`Skill "${skill}": expected ${count} rows, got ${actualCounts[skill] ?? 0}.`);
  }

  for (const r of allProc) {
    if (!r.diagnosis || !r.notes || !r.briefDescription) errors.push(`Row ${r.externalRowId}: a required Procedural text field is blank.`);
  }
  for (const r of allInterp) {
    if (!r.indication || !r.interpretation || !r.briefDescription) errors.push(`Row ${r.externalRowId}: a required Interpretative text field is blank.`);
  }

  return errors;
}

async function main() {
  const { allInterp, allProc } = buildRows();
  const errors = validate(allInterp, allProc);
  if (errors.length > 0) {
    console.error('VALIDATION FAILED - refusing to write workbook:');
    errors.forEach((e) => console.error(' - ' + e));
    process.exit(1);
  }
  console.log('Validation passed: 14/14 rows, exact counts/levels match, all fields present, no duplicates, dates/ages valid.');

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('DataEntry');
  sheet.addRow(DATA_ENTRY_HEADER);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((c) => (c.width = 30));

  for (const r of allInterp) {
    const extra = { 'Indication/Investigation/Findings/Diagnosis': r.indication, Interpretations: r.interpretation, 'Brief Description': r.briefDescription };
    sheet.addRow([
      r.externalRowId,
      'SAVE_DRAFT',
      INTERPRETATIVE_LEAF_ID,
      'Procedural and Interpretative Skills',
      'Abdominal Wall',
      'Interpretative Skill',
      r.assignmentDate,
      r.patientName,
      r.regNo,
      r.dob,
      String(completedAge(r.dob, r.assignmentDate)),
      'USG / CT scan / MRI of abdominal wall',
      JSON.stringify(extra),
    ]);
  }

  const level5HoldRows: string[] = [];
  for (const r of allProc) {
    const extra: Record<string, string> = {
      'Diagnosis/Problems': r.diagnosis,
      'Brief Procedural Notes': r.notes,
      'Brief Description': r.briefDescription,
      CompetencyLevel: r.level,
    };
    sheet.addRow([
      r.externalRowId,
      'SAVE_DRAFT',
      PROCEDURAL_LEAF_ID,
      'Procedural and Interpretative Skills',
      'Abdominal Wall',
      'Procedural skill',
      r.assignmentDate,
      r.patientName,
      r.regNo,
      r.dob,
      String(completedAge(r.dob, r.assignmentDate)),
      r.skill,
      JSON.stringify(extra),
    ]);
    if (r.level5Hold) level5HoldRows.push(r.externalRowId);
  }

  const holdSheet = wb.addWorksheet('HoldForReview');
  holdSheet.addRow(['ExternalRowId', 'HoldReason', 'Notes']);
  holdSheet.getRow(1).font = { bold: true };
  for (const id of level5HoldRows) {
    holdSheet.addRow([id, 'LEVEL5_PORTAL_HOLD', 'Competency level 5 has no corresponding portal checkbox (only Levels 1-4 exist as live DOM controls). Row is generated and mapping-valid, but cannot be selected/saved on the current live portal without substituting a different level, which is forbidden. Held for the uploader to skip until a Level 5 control exists.']);
  }
  holdSheet.columns = [{ width: 20 }, { width: 22 }, { width: 100 }];

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  let outputPath = path.join(OUTPUT_DIR, 'Abdominal-Wall_2026-09-10_2.xlsx');
  if (fs.existsSync(outputPath)) {
    outputPath = path.join(OUTPUT_DIR, 'Abdominal-Wall_2026-09-10_2_v2.xlsx');
  }
  await wb.xlsx.writeFile(outputPath);
  console.log(`New Abdominal Wall workbook written (non-destructive): ${outputPath}`);
  console.log(`Level 5 hold rows: ${JSON.stringify(level5HoldRows)}`);
}

main().catch((err) => {
  console.error('generate-abdominal-wall-v2-dataset crashed:', err);
  process.exit(1);
});
