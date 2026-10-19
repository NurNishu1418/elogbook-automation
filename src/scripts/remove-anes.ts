import ExcelJS from 'exceljs';

async function main() {
  const filePath = 'F:/2026/touhid/new project/generated-data/copy data/2nd 2nd/BCPS_AutoScript_Final_Input_Naturalized_2lt2nd000.xlsx';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.getWorksheet('UploadResult');
  if (!ws) { console.log('No UploadResult sheet'); return; }

  const header = ws.getRow(1);
  let extIdCol = 0;
  header.eachCell((cell: any, col: any) => {
    const v = String(cell.value || '').toLowerCase();
    if (v.includes('external') || v.includes('externalrowid')) extIdCol = col;
  });
  if (!extIdCol) {
    // fallback: first column
    console.log('Header cells:');
    header.eachCell((cell: any, col: any) => console.log(`  col ${col}: "${cell.value}"`));
    extIdCol = 1;
    console.log('Using column 1 as fallback');
  }

  const rowsToDelete: number[] = [];
  ws.eachRow((row: any, rowNum: any) => {
    if (rowNum === 1) return;
    const val = String(row.getCell(extIdCol).value || '');
    if (val.startsWith('ANES-')) rowsToDelete.push(rowNum);
  });

  console.log('ANES rows found:', rowsToDelete.length);

  for (let i = rowsToDelete.length - 1; i >= 0; i--) {
    ws.spliceRows(rowsToDelete[i], 1);
  }

  await wb.xlsx.writeFile(filePath);
  console.log('Done - removed', rowsToDelete.length, 'ANES entries from UploadResult');
}

main().catch(console.error);
