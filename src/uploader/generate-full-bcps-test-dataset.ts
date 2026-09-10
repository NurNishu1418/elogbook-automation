/**
 * Generates the complete 19-specialty TEST_ONLY BCPS dataset and writes it
 * into the existing AutoScript-Input workbook's DataEntry sheet (backing
 * up first). Pure local file work - zero portal contact, zero browser
 * launch. Never runs workbook:execute.
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { CONTENT, SkillEntry, InterpTemplate, ProcTemplate, CommTemplate } from './bcps-full-dataset-content';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
const TARGET_DIR = path.join(PROJECT_ROOT, 'generated-data', 'AutoScript-Input');

const DATE_RANGE_START = new Date('2026-01-01T00:00:00Z');
const DATE_RANGE_END = new Date('2026-06-30T00:00:00Z');

const PREFIX_BY_SPECIALTY: Record<string, string> = {
  'Vascular Surgery': 'VASC',
  'Minimally Invasive Surgery – Laparoscopic procedures': 'MIS',
  'Orthopaedic Surgery': 'ORTH',
  'Skin and Subcutaneous Tissue': 'SST',
  'Disorders of the Breast': 'BRST',
  'Neurosurgery': 'NEURO',
  'Gastrointestinal & HepatoBiliary System and Pancreas': 'GHP',
  'Endocrine Surgery (Thyroid, Parathyroid, Adrenal Glands)': 'ENDO',
  'Paediatric Surgery': 'PAED',
  'Anaesthesia & Procedural critical care': 'ANES',
  'Plastic Surgery': 'PLAS',
  'Parasites of Surgical Importance': 'PAR',
  'Urology': 'URO',
  'Thoracic and Cardiovascular Surgery': 'TCS',
  'Surgical Oncology': 'ONC',
  'Accident & Emergency / Casualty': 'AEC',
  'Abdominal Wall': 'AW',
  'Basic Surgical Skill': 'BSS',
  'Procedural Nutrition': 'PN',
};

const MALE_FIRST = ['Md. Kamal', 'Abdul', 'Mohammad Arif', 'Md. Zahirul', 'Tanvir', 'Md. Nurul', 'Shahidul', 'Md. Rafiqul', 'Golam', 'Md. Aminul', 'Habibur', 'Md. Shafiqul', 'Anisur', 'Md. Jahangir', 'Rezaul', 'Md. Mahbubur', 'Mizanur', 'Md. Delwar', 'Shamsul', 'Md. Faruk'];
const FEMALE_FIRST = ['Rahima', 'Nasrin', 'Farzana', 'Salma', 'Sharmin', 'Rokeya', 'Shirin', 'Nasima', 'Marufa', 'Taslima', 'Rehana', 'Shahnaz', 'Fatema', 'Rubina', 'Momena', 'Shahana', 'Rashida', 'Parveen', 'Halima', 'Aleya'];
const SURNAMES = ['Hossain', 'Begum', 'Karim', 'Akter', 'Hasan', 'Yasmin', 'Islam', 'Khatun', 'Ahmed', 'Sultana', 'Rahman', 'Chowdhury', 'Alam', 'Miah', 'Uddin', 'Khan', 'Talukder', 'Sarkar', 'Molla', 'Bhuiyan'];

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

interface GeneratedRow {
  externalRowId: string;
  action: string;
  combinationKey: string;
  form: string;
  caseType: string;
  skillType: string;
  assignmentDate: string;
  patientName: string;
  patientRegNo: string;
  dob: string;
  age: number;
  competencyItem: string;
  extraFields: Record<string, string>;
  status: 'READY' | 'LEVEL5_PORTAL_HOLD' | 'PORTAL_ROUTING_HOLD';
}

function completedAge(dobIso: string, assignIso: string): number {
  const dob = new Date(dobIso + 'T00:00:00Z');
  const assign = new Date(assignIso + 'T00:00:00Z');
  let age = assign.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = assign.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && assign.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

function randomDateInRange(rand: () => number): string {
  const spanMs = DATE_RANGE_END.getTime() - DATE_RANGE_START.getTime();
  const t = DATE_RANGE_START.getTime() + Math.floor(rand() * spanMs);
  return new Date(t).toISOString().slice(0, 10);
}

// Confirmed portal rubric (checkpoints/discover.json lookups.competence_level):
// Level 1 = Observed, Level 2 = Assisted, Level 3 = Performed under
// supervision, Level 4 = Performed Independently. Every procedural row's
// notes must state ONE of these roles, matching its assigned level, and
// must not carry conflicting role language from elsewhere.
function roleClause(level: string, skillItem: string): string {
  const skill = skillItem.charAt(0).toLowerCase() + skillItem.slice(1);
  switch (level) {
    case '1':
      return `The ${skill} was observed being performed by the supervising surgeon.`;
    case '2':
      return `The trainee assisted in performing the ${skill}.`;
    case '3':
      return `The trainee performed the ${skill} under direct supervision.`;
    case '4':
      return `The trainee performed the ${skill} independently.`;
    default:
      return '';
  }
}

// Strips any pre-existing role/independence language from a template's
// notes text before the correct role clause is appended, so no row ever
// carries two contradictory role statements. This is a closed, known set
// of phrases - every one was authored by this same project this session,
// not arbitrary external text.
function neutralizeRoleLanguage(text: string): string {
  return text
    .replace(/\s*under supervision\.?/gi, '.')
    .replace(/\s*while assisting[^.]*\./gi, '.')
    .replace(/\s*while assisting[^,]*,/gi, ',')
    .replace(/^Demonstrated (correct|safe) (instrument handling|use of|handling of)\s*/i, 'Correct use of ')
    .replace(/\.\s*\./g, '.')
    .trim();
}

function randomAdultDob(rand: () => number, assignmentDate: string, minAge: number, maxAge: number): string {
  const assign = new Date(assignmentDate + 'T00:00:00Z');
  const age = minAge + Math.floor(rand() * (maxAge - minAge + 1));
  const dob = new Date(assign);
  dob.setUTCFullYear(dob.getUTCFullYear() - age);
  dob.setUTCDate(dob.getUTCDate() - Math.floor(rand() * 300)); // jitter within the birth year so age calc is exact after recompute
  if (dob.getTime() >= assign.getTime()) dob.setUTCDate(dob.getUTCDate() - 1);
  return dob.toISOString().slice(0, 10);
}

function main() {
  const formMap = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'form-map.json'), 'utf-8'));
  const leafByCaseSkill = new Map<string, any>();
  for (const leaf of formMap.leaves ?? []) {
    leafByCaseSkill.set(`${leaf.pathLabels[1]}|||${leaf.pathLabels[2]}`, leaf);
  }

  const usedNames = new Set<string>();
  const usedRegNos = new Set<string>();
  const usedExternalIds = new Set<string>();
  const nameRand = seededRand(20260910);
  const regRand = seededRand(78341);
  let regCounter = 1000;

  function uniqueName(rand: () => number): string {
    let attempt = 0;
    while (true) {
      const isMale = rand() < 0.55;
      const firsts = isMale ? MALE_FIRST : FEMALE_FIRST;
      const first = firsts[Math.floor(rand() * firsts.length)];
      const surname = SURNAMES[Math.floor(rand() * SURNAMES.length)];
      const name = `${first} ${surname}`;
      if (!usedNames.has(name) || attempt > 500) {
        usedNames.add(name);
        return name;
      }
      attempt++;
    }
  }

  function uniqueRegNo(): string {
    while (true) {
      regCounter += 1 + Math.floor(regRand() * 3);
      const part1 = 1000 + (regCounter % 9000);
      const part2 = Math.floor(regRand() * 100);
      const regNo = `${part1}/${part2.toString().padStart(2, '0')}`;
      if (!usedRegNos.has(regNo)) {
        usedRegNos.add(regNo);
        return regNo;
      }
    }
  }

  const rows: GeneratedRow[] = [];
  let seedCounter = 1;

  for (const spec of CONTENT) {
    const prefix = PREFIX_BY_SPECIALTY[spec.caseType];
    if (!prefix) throw new Error(`No ExternalRowId prefix configured for specialty "${spec.caseType}".`);
    let rowSeq = 1;
    const isVascular = spec.caseType === 'Vascular Surgery';

    function nextExternalId(): string {
      const id = `${prefix}-${String(rowSeq).padStart(4, '0')}`;
      rowSeq++;
      if (usedExternalIds.has(id)) throw new Error(`Duplicate ExternalRowId generated: ${id}`);
      usedExternalIds.add(id);
      return id;
    }

    function buildRow(skillType: string, competencyItem: string, level: string | null, fields: Record<string, string>): void {
      const leaf = leafByCaseSkill.get(`${spec.caseType}|||${skillType}`);
      if (!leaf) throw new Error(`No live leaf found for ${spec.caseType} > ${skillType}`);
      // Resolve the EXACT live-mapped competency label (portal data
      // sometimes carries a trailing space our own content file doesn't -
      // e.g. "Core-cut biopsy " for Disorders of the Breast) so
      // CompetencyItemsChecked always matches exactly what validateRow.ts
      // requires, regardless of this content file's own spelling.
      const liveMatch = (leaf.competencyGroup ?? []).find((c: any) => c.particulars.trim() === competencyItem.trim());
      if (!liveMatch) throw new Error(`No live competency item matches "${competencyItem}" for ${spec.caseType} > ${skillType}`);
      const exactCompetencyItem = liveMatch.particulars;
      const rand = seededRand(seedCounter++);
      const assignmentDate = randomDateInRange(rand);
      const dob = randomAdultDob(rand, assignmentDate, 20, 78);
      const age = completedAge(dob, assignmentDate);
      const patientName = uniqueName(nameRand);
      const patientRegNo = uniqueRegNo();
      const extra: Record<string, string> = { ...fields };
      if (level) extra['CompetencyLevel'] = level;

      let status: GeneratedRow['status'] = 'READY';
      if (level === '5') status = 'LEVEL5_PORTAL_HOLD';
      if (isVascular) status = 'PORTAL_ROUTING_HOLD';

      rows.push({
        externalRowId: nextExternalId(),
        action: 'SAVE_DRAFT',
        combinationKey: leaf.leafId,
        form: leaf.pathLabels[0],
        caseType: spec.caseType,
        skillType,
        assignmentDate,
        patientName,
        patientRegNo,
        dob,
        age,
        competencyItem: exactCompetencyItem,
        extraFields: extra,
        status,
      });
    }

    if (spec.interpretative) {
      for (const [skill, entry] of Object.entries(spec.interpretative)) {
        const e = entry as SkillEntry<InterpTemplate>;
        for (let i = 0; i < e.min; i++) {
          const t = e.templates[i % e.templates.length];
          buildRow('Interpretative Skill', skill, null, {
            'Indication/Investigation/Findings/Diagnosis': t.indication,
            Interpretations: t.interpretation,
            'Brief Description': t.description,
          });
        }
      }
    }
    if (spec.procedural) {
      for (const [skill, entry] of Object.entries(spec.procedural)) {
        const e = entry as SkillEntry<ProcTemplate>;
        const levels = e.levels ?? [];
        for (let i = 0; i < e.min; i++) {
          const t = e.templates[i % e.templates.length];
          const level = levels.length > 0 ? levels[i % levels.length] : null;
          const cleanDiagnosis = t.diagnosis.replace(/\s*(surgery|operation|procedure|repair|anastomosis)\s+assist\.?$/i, '$1.');
          const baseNotes = neutralizeRoleLanguage(t.notes);
          const notes = level ? `${baseNotes} ${roleClause(level, skill)}` : baseNotes;
          buildRow('Procedural skill', skill, level, {
            'Diagnosis/Problems': cleanDiagnosis,
            'Brief Procedural Notes': notes,
            'Brief Description': t.description,
          });
        }
      }
    }
    if (spec.communication) {
      for (const [skill, entry] of Object.entries(spec.communication)) {
        const e = entry as SkillEntry<CommTemplate>;
        for (let i = 0; i < e.min; i++) {
          const t = e.templates[i % e.templates.length];
          buildRow('Communication and Writing Skill', skill, null, {
            'Diagnosis/Problems': t.diagnosis,
            'Brief Procedural Notes': t.notes,
            'Brief Description': t.description,
          });
        }
      }
    }
  }

  // ---------------- Validation ----------------
  const errors: string[] = [];
  const idSet = new Set<string>();
  const regSet = new Set<string>();
  for (const r of rows) {
    if (idSet.has(r.externalRowId)) errors.push(`Duplicate ExternalRowId: ${r.externalRowId}`);
    idSet.add(r.externalRowId);
    if (regSet.has(r.patientRegNo)) errors.push(`Duplicate Patient Reg No: ${r.patientRegNo}`);
    regSet.add(r.patientRegNo);
    if (!/^\d{4}\/\d{2}$/.test(r.patientRegNo)) errors.push(`${r.externalRowId}: bad Reg No format "${r.patientRegNo}"`);
    const dob = new Date(r.dob + 'T00:00:00Z');
    const assign = new Date(r.assignmentDate + 'T00:00:00Z');
    if (dob.getTime() >= assign.getTime()) errors.push(`${r.externalRowId}: DOB not before assignment date`);
    if (assign < DATE_RANGE_START || assign > DATE_RANGE_END) errors.push(`${r.externalRowId}: assignment date outside range`);
    const recalculatedAge = completedAge(r.dob, r.assignmentDate);
    if (recalculatedAge !== r.age) errors.push(`${r.externalRowId}: age mismatch (stored ${r.age}, recalculated ${recalculatedAge})`);
    try {
      JSON.parse(JSON.stringify(r.extraFields));
    } catch {
      errors.push(`${r.externalRowId}: invalid ExtraFieldsJSON`);
    }
  }
  if (errors.length > 0) {
    console.error(`VALIDATION FAILED (${errors.length} errors):`);
    errors.slice(0, 30).forEach((e) => console.error(' - ' + e));
    process.exit(1);
  }
  console.log(`Validation passed: ${rows.length} rows, 0 duplicate IDs, 0 duplicate Reg Nos, all dates/ages correct, all JSON valid.`);

  // ---------------- Split READY vs HOLD ----------------
  const readyRows = rows.filter((r) => r.status === 'READY');
  const holdRows = rows.filter((r) => r.status !== 'READY');
  console.log(`READY (upload-eligible): ${readyRows.length}. HOLD (excluded from DataEntry): ${holdRows.length}.`);

  // ---------------- Write into workbook ----------------
  const files = fs.readdirSync(TARGET_DIR).filter((f) => /^BCPS_AutoScript_Final_Input_Template(_v\d+)?\.xlsx$/.test(f));
  files.sort((a, b) => {
    const va = parseInt((a.match(/_v(\d+)\.xlsx$/) ?? [null, '1'])[1] as string, 10);
    const vb = parseInt((b.match(/_v(\d+)\.xlsx$/) ?? [null, '1'])[1] as string, 10);
    return vb - va;
  });
  const targetPath = path.join(TARGET_DIR, files[0]);
  console.log(`Target workbook: ${targetPath}`);

  const backupDir = path.join(PROJECT_ROOT, '.dev-backups', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(targetPath, path.join(backupDir, path.basename(targetPath) + '.bak'));
  console.log(`Backup written: ${path.join(backupDir, path.basename(targetPath) + '.bak')}`);

  (async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(targetPath);

    const de = wb.getWorksheet('DataEntry');
    if (!de) throw new Error('DataEntry sheet not found.');
    // Clear any existing data rows (should be 0, but be defensive) without touching the header.
    while (de.rowCount > 1) de.spliceRows(2, 1);

    for (const r of readyRows) {
      de.addRow([
        r.externalRowId,
        r.action,
        r.combinationKey,
        r.form,
        r.caseType,
        r.skillType,
        r.assignmentDate,
        r.patientName,
        r.patientRegNo,
        r.dob,
        String(r.age),
        r.competencyItem,
        JSON.stringify(r.extraFields),
      ]);
    }

    let holdSheet = wb.getWorksheet('GeneratedHolds');
    if (holdSheet) wb.removeWorksheet(holdSheet.id);
    holdSheet = wb.addWorksheet('GeneratedHolds');
    holdSheet.addRow(['ExternalRowId', 'CaseType', 'SkillType', 'CompetencyItem', 'PatientRegNo', 'AssignmentDate', 'HoldReason', 'MappedLevel', 'Notes']);
    holdSheet.getRow(1).font = { bold: true };
    holdSheet.views = [{ state: 'frozen', ySplit: 1 }];
    for (const r of holdRows) {
      holdSheet.addRow([
        r.externalRowId,
        r.caseType,
        r.skillType,
        r.competencyItem,
        r.patientRegNo,
        r.assignmentDate,
        r.status,
        r.extraFields['CompetencyLevel'] ?? '',
        r.status === 'LEVEL5_PORTAL_HOLD'
          ? 'Mapped competency level "5" has no corresponding portal checkbox (only Levels 1-4 exist). Never substituted with Level 4 - this row is documented but not upload-ready.'
          : 'Selecting Vascular Surgery as Case Type is a confirmed live portal bug that loads Thoracic and Cardiovascular Surgery\'s schema instead. This row is documented but never made upload-ready until routing is proven safe.',
      ]);
    }
    holdSheet.columns = [{ width: 16 }, { width: 40 }, { width: 26 }, { width: 55 }, { width: 14 }, { width: 16 }, { width: 22 }, { width: 12 }, { width: 70 }];

    await wb.xlsx.writeFile(targetPath);
    console.log(`Workbook updated. DataEntry rows: ${readyRows.length}. GeneratedHolds rows: ${holdRows.length}.`);

    // Write completeness + generation reports.
    const completeness: any[] = [];
    for (const spec of CONTENT) {
      const groups: [string, Record<string, SkillEntry<any>> | undefined][] = [
        ['Interpretative Skill', spec.interpretative],
        ['Procedural skill', spec.procedural],
        ['Communication and Writing Skill', spec.communication],
      ];
      for (const [skillType, entries] of groups) {
        if (!entries) continue;
        for (const [skill, entry] of Object.entries(entries)) {
          const e = entry as SkillEntry<any>;
          const generated = rows.filter((r) => r.caseType === spec.caseType && r.skillType === skillType && r.competencyItem.trim() === skill.trim());
          const uploadReady = generated.filter((r) => r.status === 'READY').length;
          const hold = generated.filter((r) => r.status !== 'READY').length;
          completeness.push({
            specialty: spec.caseType,
            skillType,
            competencyItem: skill,
            allowedLevels: e.levels ? e.levels.join(',') : '',
            pdfMinimumRequired: e.min,
            generatedCount: generated.length,
            uploadReadyCount: uploadReady,
            holdCount: hold,
            status: generated.length >= e.min ? 'PASS' : 'FAIL',
          });
        }
      }
    }
    fs.writeFileSync(
      path.join(TARGET_DIR, 'full-dataset-completeness-report.json'),
      JSON.stringify({ generatedAt: new Date().toISOString(), totalRows: rows.length, readyRows: readyRows.length, holdRows: holdRows.length, completeness }, null, 2),
      'utf-8'
    );
    console.log(`Completeness report written: ${path.join(TARGET_DIR, 'full-dataset-completeness-report.json')}`);
  })().catch((err) => {
    console.error('Workbook write failed:', err);
    process.exit(1);
  });
}

main();
