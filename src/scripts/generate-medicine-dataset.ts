import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'generated-data', 'medicin');
const MAP_PATH = path.resolve(__dirname, '..', '..', 'output', 'form-map-medicine.json');

const BANGLADESHI_NAMES = [
  'Md. Rafiqul Islam', 'Fatema Begum', 'Abdul Karim', 'Rashida Khatun', 'Md. Jahangir Alam',
  'Nasima Akter', 'Md. Shahjahan Mia', 'Halima Khatun', 'Md. Mizanur Rahman', 'Rehana Parvin',
  'Md. Abdur Rahim', 'Sahera Begum', 'Md. Kamal Hossain', 'Roksana Begum', 'Md. Shafiqul Islam',
  'Morsheda Khatun', 'Md. Nurul Haque', 'Anjuman Ara', 'Md. Fazlul Haque', 'Taslima Akter',
  'Md. Habibur Rahman', 'Kulsum Begum', 'Md. Mofizul Islam', 'Jesmin Akter', 'Md. Anisur Rahman',
  'Sufia Begum', 'Md. Sohel Rana', 'Bilkis Begum', 'Md. Alamgir Hossain', 'Rokeya Begum',
  'Md. Delwar Hossain', 'Amina Khatun', 'Md. Nazrul Islam', 'Hamida Begum', 'Md. Ruhul Amin',
  'Monowara Begum', 'Md. Ataur Rahman', 'Salma Begum', 'Md. Golam Mostafa', 'Rahela Khatun',
  'Md. Shahidul Islam', 'Tahmina Begum', 'Md. Mahabub Alam', 'Hasina Akter', 'Md. Joynal Abedin',
  'Firoza Begum', 'Md. Khorshed Alam', 'Parveen Akter', 'Md. Tofazzal Hossain', 'Josna Begum',
  'Md. Saiful Islam', 'Asma Begum', 'Md. Badrul Alam', 'Kohinoor Begum', 'Md. Mainul Islam',
  'Jahanara Begum', 'Md. Ramzan Ali', 'Mosammat Rina Begum', 'Md. Liaquat Ali', 'Nurjahan Begum',
  'Md. Zakir Hossain', 'Farida Yasmin', 'Md. Kamrul Hassan', 'Sultana Razia', 'Md. Abul Kalam',
  'Rawshan Ara', 'Md. Mokbul Hossain', 'Hosneara Begum', 'Md. Mahfuzur Rahman', 'Asiya Khatun',
  'Md. Rezaul Karim', 'Dilara Begum', 'Md. Wahiduzzaman', 'Lucky Begum', 'Md. Enamul Haque',
  'Mst. Shirin Akter', 'Md. Obaidul Haque', 'Kamrun Nahar', 'Md. Salauddin', 'Shahnaz Begum',
  'Md. Monir Hossain', 'Meherunnesa', 'Md. Akram Hossain', 'Lovely Begum', 'Md. Billal Hossain',
  'Parul Begum', 'Md. Hanif Sarkar', 'Shefali Begum', 'Md. Azizul Haque', 'Momena Khatun',
  'Md. Farid Uddin', 'Renu Begum', 'Md. Jasim Uddin', 'Aleya Begum', 'Md. Sirajul Islam',
  'Moushumi Akter', 'Md. Harunur Rashid', 'Khadija Begum', 'Md. Ayub Ali', 'Rasheda Begum',
  'Md. Taher Ali', 'Johura Begum', 'Md. Dulal Mia', 'Ambia Khatun', 'Md. Babul Mia',
  'Shamsunnahar', 'Md. Ibrahim Khalil', 'Monira Begum', 'Md. Lutfur Rahman', 'Sakina Khatun',
  'Md. Rafiq Uddin', 'Momtaz Begum', 'Md. Nur Mohammad', 'China Rani Das', 'Md. Abul Hossain',
  'Bina Rani', 'Md. Selim Reza', 'Jharna Begum', 'Md. Ashraful Alam', 'Anjali Rani',
  'Md. Mozammel Hoque', 'Ratna Begum', 'Md. Zahid Hassan', 'Poly Akter', 'Md. Abdul Mannan',
];

function randDate(): string {
  const start = new Date('2026-07-01');
  const end = new Date('2026-10-17');
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().slice(0, 10);
}

function randRegNo(): string {
  return `${1000 + Math.floor(Math.random() * 9000)}/${10 + Math.floor(Math.random() * 90)}`;
}

function randDob(ageMin: number, ageMax: number): { dob: string; age: number } {
  const age = ageMin + Math.floor(Math.random() * (ageMax - ageMin + 1));
  const year = 2026 - age;
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  return { dob: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, age };
}

let nameIdx = 0;
function nextName(): string {
  const n = BANGLADESHI_NAMES[nameIdx % BANGLADESHI_NAMES.length];
  nameIdx++;
  return n;
}

interface SkillSpec {
  skill: string;
  min: number;
  levels?: number[];
}

interface FormSpec {
  caseType: string;
  interp: SkillSpec[];
  proc: SkillSpec[];
}

const FORMS: FormSpec[] = [
  {
    caseType: 'Cardiovascular system',
    interp: [
      { skill: '24 hrs Holter Monitoring', min: 1 },
      { skill: 'Biochemical investigations', min: 3 },
      { skill: 'CT Angiogram', min: 3 },
      { skill: 'Coronary angiography', min: 5 },
      { skill: 'ECG', min: 6 },
      { skill: 'ETT', min: 2 },
      { skill: 'Echocardiography (TTE)', min: 3 },
      { skill: 'Microbiological investigations', min: 2 },
      { skill: 'Plane X-ray, contrast X-ray', min: 5 },
      { skill: 'Radionuclide study report', min: 1 },
    ],
    proc: [
      { skill: 'Arterial puncture', min: 1, levels: [1] },
      { skill: 'Central venous catheterization', min: 1, levels: [1] },
      { skill: 'Coronary angiogram', min: 1 },
      { skill: 'ECG', min: 4, levels: [1, 2, 3] },
      { skill: 'ETT', min: 1 },
      { skill: 'Echocardiography (TTE)', min: 2, levels: [1, 2] },
      { skill: 'Intramuscular and subcutaneous injections', min: 4, levels: [1, 2, 3] },
      { skill: 'Intravenous cannulation/ Setting up an IV infusion and IV drugs', min: 9, levels: [1, 2, 3] },
      { skill: 'Venipuncture and obtaining samples', min: 5, levels: [1, 2, 3] },
    ],
  },
  {
    caseType: 'Acute Medicine and Critical illness',
    interp: [
      { skill: 'Basic ventilator readings', min: 2 },
      { skill: 'Biochemical reports including ABG and electrolytes in acute settings', min: 3 },
      { skill: 'CT scan, MRI done in acute settings', min: 3 },
      { skill: 'Microbiological investigations in acute settings', min: 2 },
      { skill: 'SOFA / APACHE scoring', min: 1 },
    ],
    proc: [
      { skill: 'Arterial puncture', min: 3, levels: [1, 2, 3] },
      { skill: 'Central venous cannulation', min: 2, levels: [1, 2] },
      { skill: 'Continuous positive pressure ventilation', min: 1, levels: [1] },
      { skill: 'Endotracheal intubation', min: 3, levels: [1, 2, 3] },
      { skill: 'Extubation', min: 2, levels: [1, 2, 3] },
      { skill: 'Intermittent positive pressure ventilation ', min: 1, levels: [1] },
      { skill: 'Non-invasive ventilation/ CPAP, BiPAP ', min: 2, levels: [1, 2] },
    ],
  },
  {
    caseType: 'Endocrine system including Diabetes mellitus',
    interp: [
      { skill: 'Biochemical investigations', min: 2 },
      { skill: 'CT abdomen', min: 1 },
      { skill: 'Diabetic chart', min: 3 },
      { skill: 'Fundal photograph', min: 2 },
      { skill: 'Hormone assay', min: 5 },
      { skill: 'Plane X-ray', min: 2 },
      { skill: 'USG of Thyroid and abdominal organs related to endocrine system', min: 3 },
    ],
    proc: [
      { skill: 'Diabetic chart', min: 3, levels: [3] },
      { skill: 'Insulin/ subcutaneous injection', min: 5, levels: [3] },
      { skill: 'Short Synacthin Test', min: 2, levels: [1, 2, 3] },
      { skill: 'Ultrasound of thyroid', min: 2, levels: [1, 2] },
      { skill: 'Using glucometer', min: 5, levels: [3] },
    ],
  },
  {
    caseType: 'Infectious and Tropical diseases',
    interp: [
      { skill: 'Biochemical/ serological test', min: 3 },
      { skill: 'Culture and sensitivity report', min: 3 },
      { skill: 'Temperature Chart', min: 5 },
      { skill: 'Tuberculin test', min: 2 },
    ],
    proc: [
      { skill: 'Abscess aspiration', min: 2, levels: [1, 2] },
      { skill: 'Collection of blood, urine, pus sample for culture', min: 3, levels: [1, 2, 3] },
      { skill: 'Temperature Chart', min: 5, levels: [3] },
    ],
  },
  {
    caseType: 'Blood disorders & Transfusion Medicine',
    interp: [
      { skill: 'Microbiological investigation reports', min: 1 },
      { skill: 'Peripheral blood film report', min: 3 },
      { skill: 'Trephine biopsy report', min: 1 },
      { skill: 'X-ray/ skeletal survey', min: 2 },
    ],
    proc: [
      { skill: 'Blood film preparation', min: 3, levels: [1, 2, 3] },
      { skill: 'Transfusion of blood & blood products', min: 4, levels: [2, 3] },
      { skill: 'Trephine biopsy', min: 1, levels: [1, 2] },
    ],
  },
  {
    caseType: 'Poisoning & Envenomation',
    interp: [
      { skill: 'Biochemical investigation including toxicology screen', min: 2 },
    ],
    proc: [
      { skill: '20-minute whole blood clotting test', min: 3, levels: [1, 2, 3] },
    ],
  },
  {
    caseType: 'Nervous system',
    interp: [
      { skill: 'Biochemical investigations', min: 2 },
      { skill: 'CSF study', min: 3 },
      { skill: 'CT/MRI brain/MRA/MRV', min: 3 },
      { skill: 'Fundal Photograph', min: 2 },
      { skill: 'NCV/EMG', min: 2 },
      { skill: 'X-ray', min: 2 },
    ],
    proc: [
      { skill: 'Fundoscopy', min: 6, levels: [1, 2, 3] },
      { skill: 'Lumbar puncture', min: 3, levels: [1, 2, 3] },
      { skill: 'NCV/EMG', min: 1, levels: [1] },
      { skill: 'NCV/MCV', min: 1, levels: [1] },
    ],
  },
  {
    caseType: 'Nephrology including GU system',
    interp: [
      { skill: 'Biochemical investigations/Renal function test', min: 3 },
      { skill: 'CT scan/MRI/renogram/angiogram', min: 2 },
      { skill: 'Microbiological investigation reports', min: 10 },
      { skill: 'Renal biopsy report', min: 2 },
      { skill: 'USG KUB', min: 2 },
      { skill: 'Urine routine test reports', min: 3 },
      { skill: 'X-ray KUB/IVU', min: 3 },
    ],
    proc: [
      { skill: 'Bed side urine test', min: 3, levels: [3] },
      { skill: 'Fluid balance chart', min: 3, levels: [1, 2, 3] },
      { skill: 'Hemo dialysis', min: 1, levels: [1] },
      { skill: 'Peritoneal dialysis', min: 1, levels: [1] },
      { skill: 'Renal biopsy', min: 1, levels: [1] },
      { skill: 'Ultrasound of KUB', min: 2, levels: [1, 2] },
      { skill: 'Urethral/ bladder catheterization', min: 5, levels: [1, 2, 3] },
    ],
  },
  {
    caseType: 'Medical psychiatry',
    interp: [
      { skill: 'Drug Level', min: 2 },
      { skill: 'Hormone therapy', min: 3 },
      { skill: 'Immunotherapy', min: 1 },
    ],
    proc: [
      { skill: 'Behavior therapy', min: 1, levels: [1] },
      { skill: 'Cognitive therapy', min: 1, levels: [1] },
      { skill: 'Electroconvulsive therapy', min: 1, levels: [1] },
      { skill: 'General psychotherapy', min: 1, levels: [1] },
    ],
  },
  {
    caseType: 'Rheumatology and Bone Disease',
    interp: [
      { skill: 'Biochemical / serological investigations', min: 3 },
      { skill: 'Bone marrow density (BMD)/ DEXA scan', min: 2 },
      { skill: 'CT scan/MRI/ Bone scan', min: 2 },
      { skill: 'DAS 28/ BASDAI scoring', min: 1 },
      { skill: 'FRAX', min: 1 },
      { skill: 'Synovial fluid analysis', min: 1 },
      { skill: 'X-ray', min: 2 },
    ],
    proc: [
      { skill: 'Joint aspiration &/ or intra-articular injection', min: 3, levels: [1, 2, 3] },
    ],
  },
];

const INTERP_DESCRIPTIONS: Record<string, string[]> = {
  'default': [
    'Investigation reviewed and findings correlated with clinical presentation',
    'Report analyzed, findings consistent with provisional diagnosis',
    'Reviewed investigation report and discussed with supervisor',
    'Investigation findings noted and management plan adjusted accordingly',
    'Report reviewed, interpreted in clinical context and documented',
  ],
};

const PROC_DESCRIPTIONS: Record<string, string[]> = {
  'default': [
    'Procedure performed under supervision, patient tolerated well',
    'Procedure done aseptically, no immediate complications noted',
    'Performed successfully, post-procedure monitoring initiated',
    'Procedure completed, patient stable, findings documented',
    'Performed under guidance, technique satisfactory, outcome documented',
  ],
};

const DIAGNOSES: Record<string, string[]> = {
  'Cardiovascular system': ['Acute coronary syndrome', 'Heart failure NYHA III', 'Atrial fibrillation', 'Hypertensive crisis', 'Infective endocarditis', 'Rheumatic heart disease', 'Deep vein thrombosis', 'Dilated cardiomyopathy'],
  'Acute Medicine and Critical illness': ['Septic shock', 'Acute respiratory failure', 'Status epilepticus', 'Diabetic ketoacidosis', 'Acute liver failure', 'Severe pneumonia with ARDS', 'Multi-organ dysfunction'],
  'Endocrine system including Diabetes mellitus': ['Type 2 DM with complications', 'Thyrotoxicosis', 'Hypothyroidism', 'Diabetic nephropathy', 'Cushing syndrome', 'Adrenal insufficiency', 'Diabetic foot ulcer'],
  'Infectious and Tropical diseases': ['Dengue fever', 'Enteric fever', 'Pulmonary tuberculosis', 'Malaria', 'Kala-azar', 'Leptospirosis', 'Scrub typhus', 'Liver abscess'],
  'Blood disorders & Transfusion Medicine': ['Iron deficiency anemia', 'Aplastic anemia', 'Multiple myeloma', 'Chronic myeloid leukemia', 'Thalassemia major', 'Hemolytic anemia'],
  'Poisoning & Envenomation': ['Organophosphorus poisoning', 'Snake envenomation', 'Paracetamol overdose', 'Sedative poisoning', 'Unknown substance ingestion'],
  'Nervous system': ['Stroke (ischemic)', 'Guillain-Barré syndrome', 'Meningitis', 'Epilepsy', 'Myasthenia gravis', 'Parkinson disease', 'Peripheral neuropathy'],
  'Nephrology including GU system': ['Chronic kidney disease stage IV', 'Acute kidney injury', 'Nephrotic syndrome', 'Urinary tract infection', 'Renal calculus', 'Glomerulonephritis', 'Polycystic kidney disease'],
  'Medical psychiatry': ['Major depressive disorder', 'Bipolar affective disorder', 'Schizophrenia', 'Generalized anxiety disorder', 'Obsessive compulsive disorder'],
  'Rheumatology and Bone Disease': ['Rheumatoid arthritis', 'Systemic lupus erythematosus', 'Osteoporosis', 'Gout', 'Ankylosing spondylitis', 'Osteoarthritis'],
};

interface Row {
  externalRowId: string;
  action: string;
  combinationKey: string;
  form: string;
  caseType: string;
  skillType: string;
  date: string;
  name: string;
  regNo: string;
  dob: string;
  age: number;
  competencyItem: string;
  extraFieldsJSON: string;
}

async function main() {
  const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'));
  const leaves = map.leaves;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const rows: Row[] = [];
  let rowNum = 0;

  for (const form of FORMS) {
    const interpLeaf = leaves.find((l: any) => l.pathLabels[1] === form.caseType && l.pathLabels[2] === 'Interpretative Skill');
    const procLeaf = leaves.find((l: any) => l.pathLabels[1] === form.caseType && l.pathLabels[2] === 'Procedural skill');

    if (!interpLeaf || !procLeaf) {
      console.error(`Missing leaf for ${form.caseType}`);
      continue;
    }

    const diagList = DIAGNOSES[form.caseType] || DIAGNOSES['default'] || ['Diagnosis under evaluation'];

    for (const skill of form.interp) {
      for (let i = 0; i < skill.min; i++) {
        rowNum++;
        const { dob, age } = randDob(25, 75);
        const diag = diagList[i % diagList.length];
        const desc = INTERP_DESCRIPTIONS['default'][i % INTERP_DESCRIPTIONS['default'].length];

        const extraFields: Record<string, string> = {
          'Indication/Investigation/Findings/Diagnosis': `${diag}. ${skill.skill} performed.`,
          'Interpretations': desc,
          'Brief Description': `${skill.skill} reviewed for ${diag.toLowerCase()}`,
        };

        const prefix = form.caseType.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
        rows.push({
          externalRowId: `MED-${prefix}-I-${String(rowNum).padStart(4, '0')}`,
          action: 'SAVE_DRAFT',
          combinationKey: interpLeaf.leafId,
          form: 'Procedural and Interpretative Skills',
          caseType: form.caseType,
          skillType: 'Interpretative Skill',
          date: randDate(),
          name: nextName(),
          regNo: randRegNo(),
          dob,
          age,
          competencyItem: skill.skill,
          extraFieldsJSON: JSON.stringify(extraFields),
        });
      }
    }

    for (const skill of form.proc) {
      const availLevels = skill.levels || [];
      for (let i = 0; i < skill.min; i++) {
        rowNum++;
        const { dob, age } = randDob(25, 75);
        const diag = diagList[i % diagList.length];
        const desc = PROC_DESCRIPTIONS['default'][i % PROC_DESCRIPTIONS['default'].length];

        const extraFields: Record<string, string> = {
          'Diagnosis/Problems': diag,
          'Brief Procedural Notes': `${skill.skill}: ${desc}`,
          'Brief Description': `${skill.skill} performed for ${diag.toLowerCase()}`,
        };

        if (availLevels.length > 0) {
          const level = availLevels[i % availLevels.length];
          extraFields['CompetencyLevel'] = String(level);
        }

        const prefix = form.caseType.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
        rows.push({
          externalRowId: `MED-${prefix}-P-${String(rowNum).padStart(4, '0')}`,
          action: 'SAVE_DRAFT',
          combinationKey: procLeaf.leafId,
          form: 'Procedural and Interpretative Skills',
          caseType: form.caseType,
          skillType: 'Procedural skill',
          date: randDate(),
          name: nextName(),
          regNo: randRegNo(),
          dob,
          age,
          competencyItem: skill.skill,
          extraFieldsJSON: JSON.stringify(extraFields),
        });
      }
    }
  }

  console.log(`Generated ${rows.length} rows`);

  const wb = new ExcelJS.Workbook();
  const ds = wb.addWorksheet('DataEntry');
  ds.addRow([
    'ExternalRowId', 'Action', 'CombinationKey', 'Form', 'CaseType', 'SkillType',
    'Date of Assignment (YYYY-MM-DD)', 'Name of the Patient', 'Patient Reg No',
    'Date of Birth (YYYY-MM-DD)', 'Age', 'CompetencyItemsChecked (semicolon-separated)',
    'ExtraFieldsJSON',
  ]);

  for (const r of rows) {
    ds.addRow([
      r.externalRowId, r.action, r.combinationKey, r.form, r.caseType, r.skillType,
      r.date, r.name, r.regNo, r.dob, String(r.age), r.competencyItem, r.extraFieldsJSON,
    ]);
  }

  const ur = wb.addWorksheet('UploadResult');
  ur.addRow(['ExternalRowId', 'Excel Row', 'Processing Status', 'Draft Reference', 'Attempt Time', 'Failed Field', 'Error Message', 'Screenshot Path']);

  const outPath = path.join(OUTPUT_DIR, 'BCPS_Medicine_Full_Dataset.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log(`Saved to ${outPath}`);

  const summary: Record<string, { interp: number; proc: number }> = {};
  for (const r of rows) {
    if (!summary[r.caseType]) summary[r.caseType] = { interp: 0, proc: 0 };
    if (r.skillType === 'Interpretative Skill') summary[r.caseType].interp++;
    else summary[r.caseType].proc++;
  }
  console.log('\nSummary:');
  let totalI = 0, totalP = 0;
  for (const [ct, c] of Object.entries(summary)) {
    console.log(`  ${ct}: Interp=${c.interp}, Proc=${c.proc}, Total=${c.interp + c.proc}`);
    totalI += c.interp;
    totalP += c.proc;
  }
  console.log(`\nGrand total: Interp=${totalI}, Proc=${totalP}, Total=${totalI + totalP}`);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
