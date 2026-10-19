import ExcelJS from 'exceljs';
import path from 'path';

async function main() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('DataEntry');

  const headers = [
    'ExternalRowId',
    'Action',
    'Form',
    'CaseType',
    'SkillType',
    'CombinationKey',
    'Date of Assignment (YYYY-MM-DD)',
    'Name of the Patient',
    'Patient Reg No',
    'Date of Birth (YYYY-MM-DD)',
    'Age',
    'CompetencyItemsChecked (semicolon-separated)',
    'ExtraFieldsJSON',
  ];
  ws.addRow(headers);

  const rows = [
    {
      id: 'OBS-SMOKE-001',
      form: 'Procedural and Interpretative Skills',
      caseType: 'Gynaecology',
      skillType: 'Procedural skill',
      date: '2025-03-10',
      name: 'Fatema Begum',
      regNo: 'GYN-P-001',
      dob: '1990-05-15',
      age: '35',
      competency: 'Adenomyomectomy',
      extra: { CompetencyLevel: '1', 'Diagnosis/Problems': 'Adenomyosis', 'Brief Procedural Notes': 'Laparoscopic adenomyomectomy', 'Brief Description': 'Routine procedure' },
    },
    {
      id: 'OBS-SMOKE-002',
      form: 'Procedural and Interpretative Skills',
      caseType: 'Gynaecology',
      skillType: 'Interpretative Skill',
      date: '2025-03-11',
      name: 'Rashida Khatun',
      regNo: 'GYN-I-001',
      dob: '1985-08-20',
      age: '40',
      competency: 'CT Scan',
      extra: { 'Indication/Investigation/Findings/Diagnosis': 'Pelvic mass evaluation', 'Interpretations': 'Normal findings', 'Brief Description': 'CT abdomen pelvis' },
    },
    {
      id: 'OBS-SMOKE-003',
      form: 'Procedural and Interpretative Skills',
      caseType: 'Obstetrics',
      skillType: 'Procedural skill',
      date: '2025-03-12',
      name: 'Ayesha Siddiqua',
      regNo: 'OBS-P-001',
      dob: '1995-01-25',
      age: '30',
      competency: 'Amniocentesis',
      extra: { CompetencyLevel: '2', 'Diagnosis/Problems': 'High risk pregnancy', 'Brief Procedural Notes': 'USG guided amniocentesis', 'Brief Description': 'Diagnostic procedure' },
    },
    {
      id: 'OBS-SMOKE-004',
      form: 'Procedural and Interpretative Skills',
      caseType: 'Obstetrics',
      skillType: 'Interpretative Skill',
      date: '2025-03-13',
      name: 'Nasreen Akter',
      regNo: 'OBS-I-001',
      dob: '1992-11-10',
      age: '33',
      competency: 'CTG',
      extra: { 'Indication/Investigation/Findings/Diagnosis': 'Fetal monitoring', 'Interpretations': 'Reactive NST', 'Brief Description': 'Routine CTG monitoring' },
    },
    {
      id: 'OBS-SMOKE-005',
      form: 'Procedural and Interpretative Skills',
      caseType: 'Gynaecology & Counselling',
      skillType: 'Communication and Counselling Skill',
      date: '2025-03-14',
      name: 'Salma Begum',
      regNo: 'GYN-C-001',
      dob: '1988-04-05',
      age: '37',
      competency: '',
      extra: {},
    },
    {
      id: 'OBS-SMOKE-006',
      form: 'Procedural and Interpretative Skills',
      caseType: 'Obstetrics & Counselling',
      skillType: 'Communication and Counselling Skill',
      date: '2025-03-15',
      name: 'Mariam Akhter',
      regNo: 'OBS-C-001',
      dob: '1993-07-18',
      age: '32',
      competency: '',
      extra: {},
    },
  ];

  for (const r of rows) {
    ws.addRow([
      r.id,
      'SAVE_DRAFT',
      r.form,
      r.caseType,
      r.skillType,
      '',
      r.date,
      r.name,
      r.regNo,
      r.dob,
      r.age,
      r.competency,
      JSON.stringify(r.extra),
    ]);
  }

  // Auto-width columns
  ws.columns.forEach(col => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, cell => {
      const len = String(cell.value ?? '').length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 2, 60);
  });

  // Add UploadResult sheet
  const ur = wb.addWorksheet('UploadResult');
  ur.addRow(['ExternalRowId', 'Status', 'DraftReference', 'Error', 'Timestamp']);

  const outPath = path.resolve(__dirname, '..', '..', 'generated-data', 'BCPS_OBS_Smoke_Test_6_Entries.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log(`Written: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
