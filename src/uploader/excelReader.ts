import ExcelJS from 'exceljs';

export interface DataEntryRow {
  excelRow: number;
  externalRowId: string;
  action: string;
  combinationKey: string;
  form: string;
  caseType: string;
  skillType: string;
  dateOfAssignment: string;
  nameOfPatient: string;
  patientRegNo: string;
  dateOfBirth: string;
  age: string;
  competencyItems: string[];
  extraFields: Record<string, string>;
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'text' in (v as any)) return String((v as any).text ?? '');
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

export async function readDataEntryRows(xlsxPath: string): Promise<DataEntryRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.getWorksheet('DataEntry');
  if (!ws) throw new Error('DataEntry sheet not found in workbook.');

  const headerRow = ws.getRow(1);
  const colIndex: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    colIndex[String(cell.value ?? '').trim()] = colNumber;
  });

  const required = ['ExternalRowId', 'Action', 'Form', 'CaseType'];
  for (const r of required) {
    if (!colIndex[r]) throw new Error(`DataEntry sheet is missing required column: ${r}`);
  }

  const rows: DataEntryRow[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const externalRowId = cellText(row.getCell(colIndex['ExternalRowId']).value);
    if (!externalRowId) return; // blank row

    let extraFields: Record<string, string> = {};
    const rawJson = colIndex['ExtraFieldsJSON'] ? cellText(row.getCell(colIndex['ExtraFieldsJSON']).value) : '';
    if (rawJson && rawJson !== '{}') {
      try {
        extraFields = JSON.parse(rawJson);
      } catch {
        extraFields = { __PARSE_ERROR__: rawJson };
      }
    }

    const competencyRaw = colIndex['CompetencyItemsChecked (semicolon-separated)']
      ? cellText(row.getCell(colIndex['CompetencyItemsChecked (semicolon-separated)']).value)
      : '';
    const competencyItems = competencyRaw
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    rows.push({
      excelRow: rowNumber,
      externalRowId,
      action: cellText(row.getCell(colIndex['Action']).value),
      combinationKey: cellText(row.getCell(colIndex['CombinationKey']).value),
      form: cellText(row.getCell(colIndex['Form']).value),
      caseType: cellText(row.getCell(colIndex['CaseType']).value),
      skillType: colIndex['SkillType'] ? cellText(row.getCell(colIndex['SkillType']).value) : '',
      dateOfAssignment: colIndex['Date of Assignment (YYYY-MM-DD)'] ? cellText(row.getCell(colIndex['Date of Assignment (YYYY-MM-DD)']).value) : '',
      nameOfPatient: colIndex['Name of the Patient'] ? cellText(row.getCell(colIndex['Name of the Patient']).value) : '',
      patientRegNo: colIndex['Patient Reg No'] ? cellText(row.getCell(colIndex['Patient Reg No']).value) : '',
      dateOfBirth: colIndex['Date of Birth (YYYY-MM-DD)'] ? cellText(row.getCell(colIndex['Date of Birth (YYYY-MM-DD)']).value) : '',
      age: colIndex['Age'] ? cellText(row.getCell(colIndex['Age']).value) : '',
      competencyItems,
      extraFields,
    });
  });

  return rows;
}

export async function readExistingUploadResults(xlsxPath: string): Promise<Map<string, string>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.getWorksheet('UploadResult');
  const successByRowId = new Map<string, string>();
  if (!ws) return successByRowId;

  const headerRow = ws.getRow(1);
  const colIndex: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    colIndex[String(cell.value ?? '').trim()] = colNumber;
  });
  if (!colIndex['ExternalRowId'] || !colIndex['Processing Status'] || !colIndex['Draft Reference']) return successByRowId;

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const id = cellText(row.getCell(colIndex['ExternalRowId']).value);
    const status = cellText(row.getCell(colIndex['Processing Status']).value);
    const draftRef = cellText(row.getCell(colIndex['Draft Reference']).value);
    if (id && status === 'SUCCESS' && draftRef) successByRowId.set(id, draftRef);
  });
  return successByRowId;
}
