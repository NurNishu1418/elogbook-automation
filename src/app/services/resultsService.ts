import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

export interface UploadResultRow {
  externalRowId: string;
  excelRow: number;
  status: string;
  draftReference: string;
  attemptTime: string;
  failedField: string;
  errorMessage: string;
  screenshotPath: string;
}

export async function readUploadResults(workbookPath: string): Promise<UploadResultRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(workbookPath);
  const ws = wb.getWorksheet('UploadResult');
  if (!ws) return [];
  const rows: UploadResultRow[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals: any[] = [];
    row.eachCell({ includeEmpty: true }, (c) => vals.push(c.value));
    if (!vals[0]) return;
    rows.push({
      externalRowId: String(vals[0] ?? ''),
      excelRow: Number(vals[1] ?? 0),
      status: String(vals[2] ?? ''),
      draftReference: String(vals[3] ?? ''),
      attemptTime: String(vals[4] ?? ''),
      failedField: String(vals[5] ?? ''),
      errorMessage: String(vals[6] ?? ''),
      screenshotPath: String(vals[7] ?? ''),
    });
  });
  return rows;
}

export function readProgress(workbookPath: string): any | null {
  const dir = path.dirname(workbookPath);
  const base = path.basename(workbookPath, '.xlsx');
  const p = path.join(dir, `${base}.progress.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}
