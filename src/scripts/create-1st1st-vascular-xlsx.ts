import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

const SRC_XLSX = path.resolve(__dirname, '..', '..', 'generated-data', 'copy data', '2nd 1st', 'BCPS_Vascular_Surgery_13_Entries.xlsx');
const DST_XLSX = path.resolve(__dirname, '..', '..', 'generated-data', 'copy data', '1st 1st', 'BCPS_Vascular_Surgery_13_Entries.xlsx');

const ENTRIES = [
  { date: '2025-02-01', name: 'Rezaul Sultana', regNo: '5791/25', dob: '1964-01-17', age: 62, skillType: 'Interpretative Skill',
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Suspected peripheral arterial occlusion of the right lower limb.', 'Interpretations': 'CT angiogram shows a discrete occlusion of the superficial femoral artery with distal reformation via collaterals.', 'Brief Description': 'CT angiogram for suspected peripheral arterial occlusion.' } },
  { date: '2025-02-04', name: 'Tanvir Sultana', regNo: '8297/42', dob: '1968-03-04', age: 58, skillType: 'Interpretative Skill',
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Peripheral arterial disease evaluation prior to revascularization.', 'Interpretations': 'Angiogram shows multi-segment atherosclerotic narrowing of the femoro-popliteal segment with a patent distal run-off.', 'Brief Description': 'Angiogram for peripheral arterial disease evaluation.' } },
  { date: '2025-02-19', name: 'Aleya Sultana', regNo: '1728/73', dob: '1958-01-19', age: 68, skillType: 'Interpretative Skill',
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Suspected infrarenal abdominal aortic aneurysm.', 'Interpretations': 'CT angiogram shows a fusiform infrarenal aortic dilatation with mural thrombus, neck suitable for planning repair.', 'Brief Description': 'CT angiogram for suspected abdominal aortic aneurysm.' } },
  { date: '2025-03-09', name: 'Md. Kamal Sultana', regNo: '2906/16', dob: '1971-04-05', age: 55, skillType: 'Interpretative Skill',
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Suspected deep vein thrombosis of the left lower limb.', 'Interpretations': 'Colour Doppler shows a non-compressible, echogenic thrombus within the left femoral vein with absent flow augmentation.', 'Brief Description': 'Duplex study for suspected deep vein thrombosis.' } },
  { date: '2025-03-15', name: 'Rehana Sultana', regNo: '7173/45', dob: '1966-01-20', age: 60, skillType: 'Interpretative Skill',
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Lower-limb arterial insufficiency assessment.', 'Interpretations': 'Duplex imaging shows reduced triphasic-to-monophasic waveform conversion across the popliteal segment, consistent with proximal arterial insufficiency.', 'Brief Description': 'Duplex study for lower-limb arterial insufficiency.' } },
  { date: '2025-03-24', name: 'Shahidul Sultana', regNo: '8216/54', dob: '1961-04-06', age: 65, skillType: 'Interpretative Skill',
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Symptomatic carotid artery stenosis evaluation.', 'Interpretations': 'Carotid duplex/MRA shows a high-grade stenosis at the internal carotid artery origin with turbulent flow.', 'Brief Description': 'Duplex/MRA for carotid artery stenosis evaluation.' } },
  { date: '2025-03-31', name: 'Abdul Sultana', regNo: '3780/95', dob: '1981-01-21', age: 45, skillType: 'Interpretative Skill',
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Chronic venous insufficiency with varicose veins.', 'Interpretations': 'Colour Doppler shows reflux exceeding 1 second at the sapheno-femoral junction with incompetent long saphenous vein.', 'Brief Description': 'Duplex study for varicose vein/venous insufficiency evaluation.' } },
  { date: '2025-04-23', name: 'Md. Zahirul Sultana', regNo: '3548/96', dob: '1976-04-07', age: 50, skillType: 'Interpretative Skill',
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Pre-operative vessel mapping before arteriovenous fistula creation.', 'Interpretations': 'Doppler vessel mapping shows an adequate-calibre cephalic vein and patent radial artery suitable for fistula formation.', 'Brief Description': 'Doppler vessel mapping before AV fistula creation.' } },
  { date: '2025-04-30', name: 'Golam Sultana', regNo: '5965/13', dob: '1954-01-10', age: 72, skillType: 'Procedural skill',
    extra: { 'Diagnosis/Problems': 'Acute limb ischemia of the right lower limb due to arterial embolism.', 'Brief Procedural Notes': 'Arterial thrombo-embolectomy performed via a femoral arteriotomy using a Fogarty balloon catheter with good back-bleeding and restoration of distal pulses.', 'Brief Description': 'Arterial thrombo-embolectomy for acute limb ischemia.' } },
  { date: '2025-05-01', name: 'Halima Sultana', regNo: '4025/16', dob: '1960-04-25', age: 66, skillType: 'Procedural skill',
    extra: { 'Diagnosis/Problems': 'Symptomatic high-grade carotid artery stenosis.', 'Brief Procedural Notes': 'Carotid endarterectomy performed with removal of the atheromatous plaque from the internal carotid artery and patch closure of the arteriotomy.', 'Brief Description': 'Carotid endarterectomy for symptomatic carotid stenosis.' } },
  { date: '2025-05-05', name: 'Rashida Sultana', regNo: '5800/94', dob: '1962-01-12', age: 64, skillType: 'Procedural skill',
    extra: { 'Diagnosis/Problems': 'Popliteal artery aneurysm.', 'Brief Procedural Notes': 'Ligation and excision of the popliteal artery aneurysm performed with restoration of continuity by an interposition graft.', 'Brief Description': 'Ligation and excision of popliteal artery aneurysm.' } },
  { date: '2025-05-11', name: 'Marufa Sultana', regNo: '6193/17', dob: '1965-04-26', age: 61, skillType: 'Procedural skill',
    extra: { 'Diagnosis/Problems': 'Occlusive peripheral vascular disease of the lower limb requiring arterial reconstruction.', 'Brief Procedural Notes': 'Femoro-popliteal bypass performed using a prosthetic vascular graft with confirmation of good distal flow on completion.', 'Brief Description': 'Use of vascular graft for arterial reconstruction.' } },
  { date: '2025-05-18', name: 'Md. Mahbubur Sultana', regNo: '4597/13', dob: '1998-01-13', age: 28, skillType: 'Procedural skill',
    extra: { 'Diagnosis/Problems': 'Traumatic vascular injury of the upper limb following a road traffic accident.', 'Brief Procedural Notes': 'Vascular repair performed with primary end-to-end anastomosis of the injured artery and confirmation of distal perfusion.', 'Brief Description': 'Vascular repair for traumatic vascular injury.' } },
];

async function main() {
  fs.copyFileSync(SRC_XLSX, DST_XLSX);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(DST_XLSX);
  const ws = wb.getWorksheet('DataEntry')!;

  for (let i = 0; i < ENTRIES.length; i++) {
    const row = ws.getRow(i + 2);
    const e = ENTRIES[i];
    row.getCell(1).value = `VAS-${String(i + 1).padStart(3, '0')}`;
    row.getCell(6).value = e.skillType;
    row.getCell(7).value = e.date;
    row.getCell(8).value = e.name;
    row.getCell(9).value = e.regNo;
    row.getCell(10).value = e.dob;
    row.getCell(11).value = e.age;
    row.getCell(13).value = JSON.stringify(e.extra);
    row.commit();
  }

  const ur = wb.getWorksheet('UploadResult');
  if (ur) wb.removeWorksheet(ur.id);
  wb.addWorksheet('UploadResult');

  const base = path.join(path.dirname(DST_XLSX), 'BCPS_Vascular_Surgery_13_Entries');
  for (const ext of ['.progress.json', '.dry-run-report.json']) {
    const f = base + ext;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }

  await wb.xlsx.writeFile(DST_XLSX);
  logger.info(`Created ${DST_XLSX} with 1st 1st data (dates Feb-May 2025).`);
}

main().catch(err => { logger.error(err); process.exit(1); });
