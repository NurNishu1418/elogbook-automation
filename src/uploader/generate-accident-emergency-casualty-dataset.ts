/**
 * Synthetic test-dataset generator for Accident & Emergency / Casualty
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
 * Unlike Paediatric Surgery, this specialty's itemized counts have NO
 * arithmetic discrepancy: Interpretative (6 skills x 3 = 18) and
 * Procedural (3+3+3+3+1+1+3+3+1+1+1+3+3 = 29) sum to 18+29=47, matching
 * the specialty config's stated totals exactly. See
 * specialty-config/accident-emergency-casualty.json ->
 * quotaSource.arithmeticCheck for detail.
 *
 * All generated cases are written to be Surgical Emergency / Trauma /
 * Casualty Unit appropriate, with condition-specific ages that span
 * the realistic trauma population (not a single fixed age band) -
 * road-traffic-accident-type cases skew younger adult, but ages vary
 * naturally across rows rather than repeating a single value.
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

const SPECIALTY_DIR = path.join(PROJECT_ROOT, 'generated-data', 'Accident-Emergency-Casualty');
const DATE_RANGE_LABEL = '01-01-2026_to_30-06-2026';
const DATE_RANGE_DIR = path.join(SPECIALTY_DIR, DATE_RANGE_LABEL);
const GENERATED_DIR = path.join(DATE_RANGE_DIR, 'generated');
const REPORTS_DIR = path.join(DATE_RANGE_DIR, 'reports');
const CONFIG_PATH = path.join(SPECIALTY_DIR, 'specialty-config', 'accident-emergency-casualty.json');

const DATASET_XLSX_PATH = path.join(GENERATED_DIR, 'BCPS_Logbook_Accident_Emergency_Casualty_01-01-2026_to_30-06-2026.xlsx');

const FORM_LABEL = 'Procedural and Interpretative Skills';
const CASE_TYPE_LABEL = 'Accident & Emergency / Casualty';

const EXPECTED_INTERPRETATIVE_TOTAL = 18;
const EXPECTED_PROCEDURAL_TOTAL = 29;
const EXPECTED_GRAND_TOTAL = 47;

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
// Clinical content - concise, FCPS-logbook style, Surgical Emergency /
// Trauma / Casualty Unit specific. Styled after the real BCPS Core
// Surgical Training logbook (style reference only - no real patient
// names, reg numbers, dates, ages, or patient-identifiable diagnoses
// were copied). Every diagnosis is deliberately matched to the exact
// skill/procedure. Ages vary realistically across the trauma
// population (not a single fixed age band).
// ---------------------------------------------------------------------
const INTERPRETATIVE_SCENARIOS: Record<string, InterpScenario[]> = {
  'Contrast X-rays': [
    { diagnosis: 'Suspected diaphragmatic injury following blunt chest trauma.', notes: 'Contrast study shows the nasogastric tube coiling within the left hemithorax, confirming a ruptured left hemidiaphragm.', description: 'Contrast X-ray for suspected diaphragmatic injury.', targetAge: 34 },
    { diagnosis: 'Suspected urethral injury after pelvic fracture.', notes: 'Retrograde urethrogram shows extravasation of contrast at the level of the bulbar urethra.', description: 'Retrograde urethrogram for suspected urethral injury.', targetAge: 27 },
    { diagnosis: 'Suspected traumatic bowel injury after penetrating abdominal wound.', notes: 'Contrast study of the small bowel shows a focal leak of contrast into the peritoneal cavity.', description: 'Contrast study for suspected traumatic bowel injury.', targetAge: 22 },
  ],
  'Local X-ray of injured limbs': [
    { diagnosis: 'Suspected fracture of the right tibia and fibula after a road traffic accident.', notes: 'Local X-ray of the injured limb shows a comminuted fracture of the mid-shaft tibia and fibula.', description: 'Local limb X-ray for suspected tibial/fibular fracture.', targetAge: 29 },
    { diagnosis: 'Suspected shoulder dislocation after a fall.', notes: 'Local X-ray of the injured limb shows anterior dislocation of the glenohumeral joint.', description: 'Local limb X-ray for suspected shoulder dislocation.', targetAge: 41 },
    { diagnosis: 'Post-reduction check of a distal radius fracture.', notes: 'Local X-ray of the injured limb shows satisfactory alignment after closed reduction, with no residual displacement.', description: 'Post-reduction local limb X-ray.', targetAge: 8 },
  ],
  'Plain X-ray Abdomen': [
    { diagnosis: 'Blunt abdominal trauma after a road traffic accident.', notes: 'Plain X-ray abdomen shows an obliterated psoas shadow on the left side with no obvious free gas.', description: 'Plain X-ray abdomen for blunt abdominal trauma.', targetAge: 25 },
    { diagnosis: 'Suspected hollow viscus perforation after penetrating trauma.', notes: 'Plain X-ray abdomen (erect) shows free gas under the right dome of the diaphragm.', description: 'Plain X-ray abdomen for suspected perforation.', targetAge: 31 },
    { diagnosis: 'Post-traumatic intestinal obstruction.', notes: 'Plain X-ray abdomen shows multiple dilated bowel loops with air-fluid levels on the erect film.', description: 'Plain X-ray abdomen for post-traumatic obstruction.', targetAge: 45 },
  ],
  'USG / CT scan / MRI': [
    { diagnosis: 'Blunt abdominal trauma, FAST assessment.', notes: 'FAST scan shows free fluid in the hepatorenal pouch (Morison’s pouch), suggestive of intra-abdominal hemorrhage.', description: 'FAST scan for blunt abdominal trauma.', targetAge: 26 },
    { diagnosis: 'Suspected splenic injury after a fall from height.', notes: 'CT scan of the abdomen shows a grade III splenic laceration with a moderate perisplenic hematoma.', description: 'CT scan for suspected splenic injury.', targetAge: 19 },
    { diagnosis: 'Head injury following a road traffic accident.', notes: 'CT scan of the head shows a small right frontal extradural hematoma with no significant midline shift.', description: 'CT scan of the head for head injury.', targetAge: 33 },
  ],
  'X-ray chest A/P': [
    { diagnosis: 'Chest trauma after a road traffic accident.', notes: 'X-ray chest A/P shows fractures of the 5th and 6th ribs on the right side with no obvious pneumothorax.', description: 'X-ray chest A/P for chest trauma.', targetAge: 37 },
    { diagnosis: 'Suspected pneumothorax after blunt chest injury.', notes: 'X-ray chest A/P shows a visible visceral pleural line with absent lung markings in the left upper zone, consistent with pneumothorax.', description: 'X-ray chest A/P for suspected pneumothorax.', targetAge: 24 },
    { diagnosis: 'Suspected hemothorax after penetrating chest trauma.', notes: 'X-ray chest A/P shows blunting of the right costophrenic angle with a homogeneous opacity at the right lung base.', description: 'X-ray chest A/P for suspected hemothorax.', targetAge: 30 },
  ],
  'X-ray pelvis': [
    { diagnosis: 'Pelvic trauma after a road traffic accident.', notes: 'X-ray pelvis shows a fracture of the right superior and inferior pubic rami.', description: 'X-ray pelvis for pelvic trauma.', targetAge: 39 },
    { diagnosis: 'Suspected pelvic fracture in a polytrauma patient.', notes: 'X-ray pelvis shows disruption of the right sacroiliac joint with widening of the pubic symphysis, consistent with an open-book pelvic injury.', description: 'X-ray pelvis for suspected fracture in polytrauma.', targetAge: 28 },
    { diagnosis: 'Suspected acetabular fracture after a fall from height.', notes: 'X-ray pelvis shows a fracture line extending through the posterior wall of the right acetabulum.', description: 'X-ray pelvis for suspected acetabular fracture.', targetAge: 44 },
  ],
};

const PROCEDURAL_SCENARIOS: Record<string, ProcScenario[]> = {
  'Airway management (Basic and advanced)': [
    { diagnosis: 'Severe head injury with airway compromise after a road traffic accident.', notes: 'Airway secured with rapid-sequence endotracheal intubation; correct tube placement confirmed by chest auscultation and capnography.', description: 'Advanced airway management for severe head injury.', targetAge: 26, level: '4' },
    { diagnosis: 'Polytrauma with airway obstruction from blood and secretions.', notes: 'Airway cleared by suction and jaw thrust, followed by insertion of an oropharyngeal airway with high-flow oxygen.', description: 'Basic airway management for polytrauma.', targetAge: 32, level: '3' },
    { diagnosis: 'Maxillofacial trauma with airway compromise.', notes: 'Airway secured with a supraglottic airway device as a bridge, followed by controlled endotracheal intubation.', description: 'Advanced airway management for maxillofacial trauma.', targetAge: 21, level: '4' },
  ],
  'Application of cervical collar': [
    { diagnosis: 'Suspected cervical spine injury after a fall from height.', notes: 'A rigid cervical collar of appropriate size applied with manual in-line stabilization maintained throughout.', description: 'Cervical collar application for suspected C-spine injury.', targetAge: 35, level: '3' },
    { diagnosis: 'Road traffic accident with neck pain and suspected cervical spine injury.', notes: 'Rigid cervical collar applied at the scene assessment, with head blocks and straps added for full immobilization.', description: 'Cervical collar application after road traffic accident.', targetAge: 23, level: '4' },
    { diagnosis: 'Suspected cervical spine injury in an unconscious polytrauma patient.', notes: 'Cervical collar applied by a two-person technique while maintaining manual in-line cervical stabilization.', description: 'Cervical collar application in unconscious polytrauma patient.', targetAge: 40, level: '3' },
  ],
  'Application of tourniquet': [
    { diagnosis: 'Traumatic amputation of the left forearm with massive hemorrhage.', notes: 'A windlass tourniquet applied proximal to the amputation site, controlling hemorrhage; time of application recorded.', description: 'Tourniquet application for traumatic limb amputation.', targetAge: 29, level: '4' },
    { diagnosis: 'Severe laceration of the right thigh with uncontrolled bleeding after a machinery accident.', notes: 'Tourniquet applied above the wound with adequate pressure to control arterial bleeding; limb re-checked for distal pulse absence.', description: 'Tourniquet application for severe limb laceration.', targetAge: 33, level: '3' },
    { diagnosis: 'Traumatic partial amputation of the lower leg with massive hemorrhage.', notes: 'Tourniquet applied at the scene and time-tagged, with hemorrhage successfully controlled prior to transfer.', description: 'Tourniquet application for traumatic partial limb amputation.', targetAge: 18, level: '4' },
  ],
  'Application of traction splint': [
    { diagnosis: 'Closed fracture of the right femoral shaft after a road traffic accident.', notes: 'Traction splint applied to the injured limb with gentle longitudinal traction, improving limb alignment and pain.', description: 'Traction splint application for closed femoral shaft fracture.', targetAge: 27, level: '3' },
    { diagnosis: 'Suspected femoral shaft fracture in a polytrauma patient.', notes: 'Traction splint applied with careful padding of bony prominences and distal neurovascular status confirmed intact.', description: 'Traction splint application for suspected femoral shaft fracture.', targetAge: 31, level: '4' },
    { diagnosis: 'Closed fracture of the left femoral shaft after a fall from height.', notes: 'Traction splint applied under adequate analgesia with continuous monitoring of distal circulation.', description: 'Traction splint application for closed femoral shaft fracture.', targetAge: 24, level: '3' },
  ],
  'Central venous catheterization': [
    { diagnosis: 'Hypovolemic shock from blunt trauma requiring central venous access.', notes: 'Central venous catheter inserted via the right internal jugular vein under ultrasound guidance for rapid volume resuscitation.', description: 'Central venous catheterization for hypovolemic shock.', targetAge: 36, level: '3' },
  ],
  'Chest tube insertion': [
    { diagnosis: 'Traumatic hemothorax after blunt chest injury.', notes: 'Chest tube inserted in the 5th intercostal space, mid-axillary line, with immediate drainage of blood and re-expansion of the lung confirmed.', description: 'Chest tube insertion for traumatic hemothorax.', targetAge: 28, level: '3' },
  ],
  Laparoscopy: [
    { diagnosis: 'Suspected intra-abdominal injury in a hemodynamically stable blunt trauma patient.', notes: 'Diagnostic laparoscopy performed, revealing a small serosal tear of the jejunum with minimal hemoperitoneum, repaired laparoscopically.', description: 'Diagnostic laparoscopy for blunt abdominal trauma.', targetAge: 25, level: '2' },
    { diagnosis: 'Diagnostic laparoscopy for penetrating abdominal trauma with a tangential wound.', notes: 'Laparoscopy performed to assess peritoneal breach; no significant visceral injury identified and the wound tract explored.', description: 'Diagnostic laparoscopy for penetrating abdominal trauma.', targetAge: 22, level: '1' },
    { diagnosis: 'Suspected intra-abdominal injury after a stable blunt trauma with equivocal imaging.', notes: 'Laparoscopy performed and confirmed a small subcapsular liver hematoma with no active bleeding, managed conservatively.', description: 'Diagnostic laparoscopy for equivocal blunt abdominal trauma.', targetAge: 30, level: '2' },
  ],
  Laparotomy: [
    { diagnosis: 'Penetrating abdominal trauma with generalized peritonitis.', notes: 'Emergency laparotomy performed through a midline incision, revealing a perforated small bowel loop which was resected and anastomosed.', description: 'Emergency laparotomy for penetrating abdominal trauma.', targetAge: 26, level: '1' },
    { diagnosis: 'Blunt abdominal trauma with hemoperitoneum after a road traffic accident.', notes: 'Laparotomy performed revealing active bleeding from a mesenteric vessel, controlled by ligation with evacuation of hemoperitoneum.', description: 'Laparotomy for blunt abdominal trauma with hemoperitoneum.', targetAge: 34, level: '2' },
    { diagnosis: 'Ruptured viscus following blunt abdominal injury.', notes: 'Laparotomy performed showing a ruptured segment of ileum with fecal contamination, resected with a diverting ileostomy fashioned.', description: 'Laparotomy for ruptured viscus.', targetAge: 41, level: '1' },
  ],
  Pericardiocentesis: [
    { diagnosis: 'Cardiac tamponade from penetrating chest trauma.', notes: 'Emergency pericardiocentesis performed via the subxiphoid approach, aspirating blood from the pericardial sac with immediate hemodynamic improvement.', description: 'Pericardiocentesis for traumatic cardiac tamponade.', targetAge: 23, level: '2' },
  ],
  'Stoma creation (Colostomy and ileostomy)': [
    { diagnosis: 'Traumatic colonic perforation requiring fecal diversion.', notes: 'A defunctioning loop colostomy fashioned in the left iliac fossa following primary repair of the colonic injury.', description: 'Stoma creation for traumatic colonic perforation.', targetAge: 29, level: '2' },
  ],
  Tracheostomy: [
    { diagnosis: 'Prolonged airway compromise from severe maxillofacial trauma.', notes: 'Elective tracheostomy performed through a horizontal neck incision at the second and third tracheal rings for definitive airway control.', description: 'Tracheostomy for prolonged airway compromise.', targetAge: 38, level: '2' },
  ],
  'Wound debridement': [
    { diagnosis: 'Contaminated traumatic wound of the left leg after a road traffic accident.', notes: 'Wound debridement performed, excising devitalized tissue and foreign debris, followed by copious saline lavage.', description: 'Wound debridement for contaminated traumatic wound.', targetAge: 27, level: '3' },
    { diagnosis: 'Road-traffic-accident wound of the forearm with devitalized tissue.', notes: 'Thorough surgical debridement performed removing necrotic muscle and skin, with the wound left open for delayed closure.', description: 'Wound debridement for road-traffic-accident wound.', targetAge: 20, level: '2' },
    { diagnosis: 'Compound fracture wound of the tibia with gross contamination.', notes: 'Wound debridement performed in theatre with pulsed lavage irrigation and removal of all non-viable tissue before fracture stabilization.', description: 'Wound debridement for compound fracture wound.', targetAge: 32, level: '3' },
  ],
  'Wound packing': [
    { diagnosis: 'Deep traumatic laceration of the scalp with active bleeding.', notes: 'Wound packed with sterile gauze under firm pressure, achieving hemostasis prior to definitive closure.', description: 'Wound packing for deep traumatic laceration.', targetAge: 24, level: '3' },
    { diagnosis: 'Penetrating wound of the buttock requiring packing for hemostasis.', notes: 'Deep wound packed layer by layer with ribbon gauze to control ongoing venous oozing, with the pack secured and documented.', description: 'Wound packing for penetrating wound hemostasis.', targetAge: 30, level: '4' },
    { diagnosis: 'Deep traumatic laceration of the groin with active bleeding after a fall onto sharp metal.', notes: 'Wound packing performed with continuous gauze under direct pressure, controlling brisk bleeding until definitive surgical repair.', description: 'Wound packing for deep traumatic laceration with active bleeding.', targetAge: 36, level: '3' },
  ],
};

const MALE_FIRST = [
  'Rahim', 'Karim', 'Jasim', 'Anwar', 'Selim', 'Faruk', 'Mizanur', 'Habibur', 'Shahin', 'Mostafa',
  'Nazrul', 'Delwar', 'Aminul', 'Kamrul', 'Ashraf', 'Ripon', 'Zahid', 'Saiful', 'Monir', 'Rafiqul',
];
const FEMALE_FIRST = [
  'Rehana', 'Fatema', 'Shirin', 'Rokeya', 'Salma', 'Nasrin', 'Parvin', 'Shahnaz', 'Rina', 'Momena',
  'Halima', 'Josna', 'Rashida', 'Farida', 'Nazma', 'Rupali', 'Shefali', 'Asma', 'Rabeya', 'Morzina',
];
const SURNAMES = [
  'Hossain', 'Begum', 'Karim', 'Akter', 'Hasan', 'Yasmin', 'Islam', 'Khatun', 'Ahmed', 'Sultana',
  'Rahman', 'Chowdhury', 'Alam', 'Miah', 'Uddin', 'Khan', 'Talukder', 'Sarkar', 'Molla', 'Bhuiyan',
];

// Trauma/casualty patients span all ages and both sexes fairly evenly -
// unlike the paediatric-only pool used for Paediatric Surgery, this pool
// mixes adult male and female first names with a shared surname list.
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
        externalRowId: `AEC-${(globalIndex + 1).toString().padStart(3, '0')}`,
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
        externalRowId: `AEC-${(globalIndex + 1).toString().padStart(3, '0')}`,
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
  logger.info('Generating Accident & Emergency / Casualty dataset (USER-PROVIDED EXACT COUNTS, dry-run only).');

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
  logger.info(`All 19 configured skills matched exactly to the mapped portal data (${labelDifferences.length} label difference(s) found), and all requested competence levels are portal-valid.`);

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
    `Total rows planned (USER-PROVIDED EXACT COUNTS, itemized breakdown - see quotaSource.arithmeticCheck in config): ${totalRowsPlanned} (Interpretative=${interpPlanned}, Procedural=${procPlanned})`
  );

  const namePool = buildUniqueNamePool(totalRowsPlanned, 18455);
  const regNoPool = buildUniqueRegNos(totalRowsPlanned, 19566);

  const rows = generateRows(config, namePool, regNoPool);
  logger.info(`Generated ${rows.length} rows.`);

  const ageErrors: string[] = [];
  for (const r of rows) {
    const recomputed = calculateAge(r.dateOfBirth, r.dateOfAssignment);
    if (recomputed !== r.age) ageErrors.push(`${r.externalRowId}: DOB=${r.dateOfBirth}, AssignDate=${r.dateOfAssignment}, stored=${r.age}, recomputed=${recomputed}`);
    if (new Date(r.dateOfBirth) >= new Date(r.dateOfAssignment)) ageErrors.push(`${r.externalRowId}: DOB (${r.dateOfBirth}) is not before Assignment Date (${r.dateOfAssignment}).`);
    if (r.age < 0 || r.age > 90) ageErrors.push(`${r.externalRowId}: age ${r.age} is not a plausible Accident & Emergency / Casualty age.`);
  }
  if (ageErrors.length > 0) {
    logger.error(`DOB/Age verification FAILED for ${ageErrors.length} issue(s):`);
    ageErrors.forEach((e) => logger.error(`  ${e}`));
    process.exit(1);
  }
  logger.info('DOB/Age verification passed for all rows (DOB before Assignment Date, exact completed age, trauma-population-appropriate).');

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
    JSON.stringify({ generatedAt: new Date().toISOString(), totalSkillsRequested: 19, totalSkillsMatched: 19, unmatchedSkills: unmatched, labelDifferences, levelMismatches }, null, 2),
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
    specialty: 'Accident & Emergency / Casualty',
    trainingContext: 'Surgical Emergency / Trauma / Casualty Unit',
    dateRange: { label: DATE_RANGE_LABEL, from: '2026-01-01', to: '2026-06-30' },
    datasetWorkbook: DATASET_XLSX_PATH,
    quotaDecision: {
      countSource: 'USER_PROVIDED_EXACT_COUNTS_ITEMIZED',
      portalQuotaUsedToSizeDataset: false,
      arithmeticDiscrepancy:
        'None for this specialty. Itemized Interpretative (6 skills x 3 = 18) and Procedural (3+3+3+3+1+1+3+3+1+1+1+3+3 = 29) sum to 18+29=47, matching the stated totals exactly - see quotaSource.arithmeticCheck in specialty-config/accident-emergency-casualty.json.',
      reason: 'Per explicit user instruction, this dataset uses the exact per-skill counts and competence levels supplied for this specialty (18 Interpretative + 29 Procedural = 47). The portal\'s own mapped minimums were NOT used to size this dataset - recorded in specialty-config/accident-emergency-casualty.json for traceability only.',
    },
    competenceLevelHandling: 'For every Procedural skill with more than one allowed competence level, individual rows use varying portal-valid levels (never multiplying row count) - see procedural_competenceLevelUsage in row-count-summary.json for the exact levels used per skill.',
    ageRealism: 'Every row uses an age plausible for the exact clinical scenario within the surgical emergency / trauma / casualty population - ages vary naturally across rows (predominantly working-age adults for road-traffic-accident and penetrating-trauma cases, with some paediatric and older-adult cases for falls) rather than a single fixed age band.',
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
  logger.error(`generate-accident-emergency-casualty-dataset crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
