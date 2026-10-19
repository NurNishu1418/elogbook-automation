import { readDataEntryRows } from '../uploader/excelReader';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const rows = await readDataEntryRows('generated-data/medicin/BCPS_Medicine_Full_Dataset.xlsx');
  const out: string[] = [];
  out.push('Total rows: ' + rows.length);

  const ids = rows.map((r: any) => r.externalRowId);
  const dupeSet = new Set(ids.filter((id: string, i: number) => ids.indexOf(id) !== i));
  out.push('Duplicate IDs: ' + (dupeSet.size > 0 ? [...dupeSet].join(', ') : 'None'));

  let ageMismatch = 0;
  const ageIssues: string[] = [];
  for (const r of rows) {
    if (!r.dateOfAssignment || !r.dateOfBirth) continue;
    const dob = new Date(r.dateOfBirth);
    const assign = new Date(r.dateOfAssignment);
    const bday = new Date(assign.getFullYear(), dob.getMonth(), dob.getDate());
    const calc = assign.getFullYear() - dob.getFullYear() - (assign < bday ? 1 : 0);
    const provided = parseInt(r.age);
    if (calc !== provided) {
      ageMismatch++;
      if (ageIssues.length < 10) ageIssues.push(`${r.externalRowId}: DOB=${r.dateOfBirth} Assign=${r.dateOfAssignment} Provided=${provided} Calc=${calc}`);
    }
  }
  out.push('Age mismatches: ' + ageMismatch);
  for (const a of ageIssues) out.push('  ' + a);

  let jsonErr = 0;
  for (const r of rows) { if (r.extraFields['__PARSE_ERROR__']) jsonErr++; }
  out.push('JSON errors: ' + jsonErr);

  let clinFlags = 0;
  const flagDetails: string[] = [];
  for (const r of rows) {
    const diag = (r.extraFields['Indication/Investigation/Findings/Diagnosis'] || r.extraFields['Diagnosis/Problems'] || '').toLowerCase();
    const skill = r.competencyItems[0] || '';
    let flag = '';
    if (skill === '24 hrs Holter Monitoring' && diag.includes('acute coronary')) flag = 'Holter+ACS';
    if (skill === 'ETT' && (diag.includes('nyha iii') || diag.includes('acute coronary'))) flag = 'ETT+ACS/HF';
    if (skill === 'Diabetic chart' && !diag.includes('diabet')) flag = 'DiabeticChart+NonDM';
    if (skill.includes('Insulin') && !diag.includes('diabet') && !diag.includes('hypergly')) flag = 'Insulin+NonDM';
    if (skill === 'Tuberculin test' && (diag.includes('dengue') || diag.includes('enteric'))) flag = 'Tuberculin+Dengue/Enteric';
    if (skill === 'Abscess aspiration' && !diag.includes('abscess')) flag = 'AbscessAsp+NoAbscess';
    if (skill.includes('Trephine biopsy') && diag.includes('iron deficiency')) flag = 'Trephine+IDA';
    if ((skill === 'NCV/EMG' || skill === 'NCV/MCV') && diag.includes('stroke')) flag = 'NCV+Stroke';
    if (skill === '20-minute whole blood clotting test' && !diag.includes('snake') && !diag.includes('envenom')) flag = 'WBCT+NonSnake';
    if (skill.includes('Joint aspiration') && diag.includes('osteoporosis') && !diag.includes('arthri')) flag = 'JointAsp+Osteoporosis';
    if (flag) {
      clinFlags++;
      flagDetails.push(`${r.externalRowId} [${skill}] ${r.caseType}: ${flag} => diag="${diag.substring(0, 80)}"`);
    }
  }
  out.push('Clinical flags: ' + clinFlags);
  for (const f of flagDetails) out.push('  ' + f);

  const descMap = new Map<string, number>();
  for (const r of rows) {
    for (const k of ['Brief Description', 'Indication/Investigation/Findings/Diagnosis', 'Interpretations', 'Brief Procedural Notes']) {
      const v = r.extraFields[k];
      if (v) descMap.set(v, (descMap.get(v) || 0) + 1);
    }
  }
  let repeats = 0;
  const repeatEx: string[] = [];
  for (const [val, c] of descMap) {
    if (c > 2) {
      repeats++;
      if (repeatEx.length < 15) repeatEx.push(`"${val.substring(0, 70)}" x${c}`);
    }
  }
  out.push('Repeated values (>2x): ' + repeats);
  for (const ex of repeatEx) out.push('  ' + ex);

  let missingFields = 0;
  for (const r of rows) {
    if (!r.dateOfAssignment || !r.nameOfPatient || !r.patientRegNo || !r.dateOfBirth || !r.age) { missingFields++; continue; }
    if (r.skillType === 'Interpretative Skill') {
      if (!r.extraFields['Indication/Investigation/Findings/Diagnosis'] || !r.extraFields['Interpretations']) missingFields++;
    }
    if (r.skillType === 'Procedural skill') {
      if (!r.extraFields['Brief Procedural Notes']) missingFields++;
    }
  }
  out.push('Records with missing required fields: ' + missingFields);

  const result = out.join('\n');
  fs.writeFileSync('generated-data/medicin/audit-preliminary.txt', result, 'utf-8');
  process.stderr.write(result + '\n');
}

main().catch(e => { process.stderr.write('ERR: ' + e.message + '\n'); process.exit(1); });
