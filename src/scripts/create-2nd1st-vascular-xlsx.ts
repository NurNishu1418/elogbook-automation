import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

const SRC_XLSX = path.resolve(__dirname, '..', '..', 'generated-data', 'copy data', '2nd 2nd', 'BCPS_Vascular_Surgery_13_Entries.xlsx');
const DST_XLSX = path.resolve(__dirname, '..', '..', 'generated-data', 'copy data', '2nd 1st', 'BCPS_Vascular_Surgery_13_Entries.xlsx');

const ENTRIES = [
  { date: '2026-01-06', regNo: '5656/82', dob: '1964-01-17', age: 62,
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Suspected peripheral arterial occlusion of the right lower limb.', 'Interpretations': 'CT angiogram shows a discrete occlusion of the superficial femoral artery with distal reformation via collaterals.', 'Brief Description': 'CT angiogram for suspected peripheral arterial occlusion.' } },
  { date: '2026-01-10', regNo: '1499/83', dob: '1968-03-04', age: 58,
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Peripheral arterial disease evaluation prior to revascularization.', 'Interpretations': 'Angiogram shows multi-segment atherosclerotic narrowing of the femoro-popliteal segment with a patent distal run-off.', 'Brief Description': 'Angiogram for peripheral arterial disease evaluation.' } },
  { date: '2026-01-14', regNo: '8110/73', dob: '1958-01-19', age: 68,
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Suspected infrarenal abdominal aortic aneurysm.', 'Interpretations': 'CT angiogram shows a fusiform infrarenal aortic dilatation with mural thrombus, neck suitable for planning repair.', 'Brief Description': 'CT angiogram for suspected abdominal aortic aneurysm.' } },
  { date: '2026-02-12', regNo: '3502/47', dob: '1971-04-05', age: 55,
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Suspected deep vein thrombosis of the left lower limb.', 'Interpretations': 'Colour Doppler shows a non-compressible, echogenic thrombus within the left femoral vein with absent flow augmentation.', 'Brief Description': 'Duplex study for suspected deep vein thrombosis.' } },
  { date: '2026-02-26', regNo: '8495/80', dob: '1966-01-20', age: 60,
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Lower-limb arterial insufficiency assessment.', 'Interpretations': 'Duplex imaging shows reduced triphasic-to-monophasic waveform conversion across the popliteal segment, consistent with proximal arterial insufficiency.', 'Brief Description': 'Duplex study for lower-limb arterial insufficiency.' } },
  { date: '2026-03-04', regNo: '7931/68', dob: '1961-04-06', age: 65,
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Symptomatic carotid artery stenosis evaluation.', 'Interpretations': 'Carotid duplex/MRA shows a high-grade stenosis at the internal carotid artery origin with turbulent flow.', 'Brief Description': 'Duplex/MRA for carotid artery stenosis evaluation.' } },
  { date: '2026-03-27', regNo: '3701/82', dob: '1981-01-21', age: 45,
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Chronic venous insufficiency with varicose veins.', 'Interpretations': 'Colour Doppler shows reflux exceeding 1 second at the sapheno-femoral junction with incompetent long saphenous vein.', 'Brief Description': 'Duplex study for varicose vein/venous insufficiency evaluation.' } },
  { date: '2026-04-22', regNo: '5097/91', dob: '1976-04-07', age: 50,
    extra: { 'Indication/Investigation/Findings/Diagnosis': 'Pre-operative vessel mapping before arteriovenous fistula creation.', 'Interpretations': 'Doppler vessel mapping shows an adequate-calibre cephalic vein and patent radial artery suitable for fistula formation.', 'Brief Description': 'Doppler vessel mapping before AV fistula creation.' } },
  { date: '2026-04-29', regNo: '5334/57', dob: '1954-01-10', age: 72,
    extra: { 'Diagnosis/Problems': 'Acute limb ischemia of the right lower limb due to arterial embolism.', 'Brief Procedural Notes': 'Arterial thrombo-embolectomy performed via a femoral arteriotomy using a Fogarty balloon catheter with good back-bleeding and restoration of distal pulses.', 'Brief Description': 'Arterial thrombo-embolectomy for acute limb ischemia.' } },
  { date: '2026-05-06', regNo: '5600/71', dob: '1960-04-25', age: 66,
    extra: { 'Diagnosis/Problems': 'Symptomatic high-grade carotid artery stenosis.', 'Brief Procedural Notes': 'Carotid endarterectomy performed with removal of the atheromatous plaque from the internal carotid artery and patch closure of the arteriotomy.', 'Brief Description': 'Carotid endarterectomy for symptomatic carotid stenosis.' } },
  { date: '2026-06-07', regNo: '3176/79', dob: '1962-01-12', age: 64,
    extra: { 'Diagnosis/Problems': 'Popliteal artery aneurysm.', 'Brief Procedural Notes': 'Ligation and excision of the popliteal artery aneurysm performed with restoration of continuity by an interposition graft.', 'Brief Description': 'Ligation and excision of popliteal artery aneurysm.' } },
  { date: '2026-06-13', regNo: '8353/24', dob: '1965-04-26', age: 61,
    extra: { 'Diagnosis/Problems': 'Occlusive peripheral vascular disease of the lower limb requiring arterial reconstruction.', 'Brief Procedural Notes': 'Femoro-popliteal bypass performed using a prosthetic vascular graft with confirmation of good distal flow on completion.', 'Brief Description': 'Use of vascular graft for arterial reconstruction.' } },
  { date: '2026-06-21', regNo: '2507/63', dob: '1998-01-13', age: 28,
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
    row.getCell(7).value = e.date;    // Date of Assignment
    row.getCell(9).value = e.regNo;   // Patient Reg No
    row.getCell(10).value = e.dob;    // Date of Birth
    row.getCell(11).value = e.age;    // Age
    row.getCell(13).value = JSON.stringify(e.extra); // ExtraFieldsJSON
    row.commit();
  }

  // Remove UploadResult sheet and old progress files
  const ur = wb.getWorksheet('UploadResult');
  if (ur) wb.removeWorksheet(ur.id);

  const base = path.join(path.dirname(DST_XLSX), 'BCPS_Vascular_Surgery_13_Entries');
  for (const ext of ['.progress.json', '.dry-run-report.json']) {
    const f = base + ext;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }

  await wb.xlsx.writeFile(DST_XLSX);
  logger.info(`Created ${DST_XLSX} with correct 2nd 1st data.`);
}

main().catch(err => { logger.error(err); process.exit(1); });
