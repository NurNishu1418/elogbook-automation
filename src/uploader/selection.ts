import ExcelJS from 'exceljs';
import { DataEntryRow } from './excelReader';
import { validateRow } from './validateRow';

/**
 * Row-selection logic shared between the CLI runner (run-workbook.ts) and
 * the web app's pre-run preview (src/app/services/selectionPreview.ts), so
 * "what rows will this job touch" can never diverge between what the app
 * shows the user before starting and what actually gets processed.
 */
export type SelectionMode = 'not-yet-uploaded' | 'all-valid' | 'selected' | 'range' | 'failed-only';

export interface ValidatedRow {
  row: DataEntryRow;
  result: ReturnType<typeof validateRow>;
}

export function selectEligibleRows(
  validRows: ValidatedRow[],
  selectionMode: SelectionMode,
  opts: {
    selectedRowIds?: string[];
    rangeStart?: number | null;
    rangeEnd?: number | null;
    alreadyDoneLocally: Map<string, string>;
    lastAttemptStatus: Map<string, string>;
  }
): ValidatedRow[] {
  const selectedRowIds = opts.selectedRowIds ?? [];
  switch (selectionMode) {
    case 'all-valid':
      return validRows;
    case 'selected':
      return validRows.filter((v) => selectedRowIds.includes(v.row.externalRowId));
    case 'range':
      return validRows.filter(
        (v) =>
          (opts.rangeStart == null || v.row.excelRow >= opts.rangeStart) &&
          (opts.rangeEnd == null || v.row.excelRow <= opts.rangeEnd)
      );
    case 'failed-only':
      return validRows.filter((v) => opts.lastAttemptStatus.get(v.row.externalRowId) === 'FAILED');
    case 'not-yet-uploaded':
    default:
      return validRows.filter((v) => !opts.alreadyDoneLocally.has(v.row.externalRowId));
  }
}

export async function readLastAttemptStatus(xlsxPath: string): Promise<Map<string, string>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.getWorksheet('UploadResult');
  const map = new Map<string, string>();
  if (!ws) return map;
  const headerRow = ws.getRow(1);
  const colIndex: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    colIndex[String(cell.value ?? '').trim()] = colNumber;
  });
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const id = String(row.getCell(colIndex['ExternalRowId']).value ?? '');
    const status = String(row.getCell(colIndex['Processing Status']).value ?? '');
    if (id) map.set(id, status); // later rows overwrite earlier ones, keeping the LAST attempt's status
  });
  return map;
}
