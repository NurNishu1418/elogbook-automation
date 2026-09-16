import fs from 'fs';
import path from 'path';
import { readDataEntryRows } from '../../uploader/excelReader';
import { validateRow, LeafForValidation } from '../../uploader/validateRow';
import { readExistingUploadResults } from '../../uploader/excelReader';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

export function loadLeaves(): LeafForValidation[] {
  const formMap = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'output', 'form-map.json'), 'utf-8'));
  return formMap.leaves.map((l: any) => ({
    leafId: l.leafId,
    pathLabels: l.pathLabels,
    fields: l.fields ?? [],
    competencyGroup: l.competencyGroup ?? [],
  }));
}

/**
 * Local-only validation (no login, no browser) - reuses the exact same
 * readDataEntryRows + validateRow functions the CLI uploaders use, so a row
 * that dry-run reports as valid here is guaranteed valid to the real
 * uploader too.
 */
export async function runDryRun(workbookPath: string) {
  const leaves = loadLeaves();
  const allRows = await readDataEntryRows(workbookPath);
  const draftRows = allRows.filter((r) => r.action === 'SAVE_DRAFT');
  const alreadyDone = await readExistingUploadResults(workbookPath);

  const details = draftRows.map((row) => {
    const result = validateRow(row, leaves);
    return {
      externalRowId: row.externalRowId,
      excelRow: row.excelRow,
      form: row.form,
      caseType: row.caseType,
      skillType: row.skillType,
      valid: result.valid,
      errors: result.errors,
      alreadyUploaded: alreadyDone.has(row.externalRowId),
      draftReference: alreadyDone.get(row.externalRowId) ?? null,
    };
  });

  return {
    workbookPath,
    generatedAt: new Date().toISOString(),
    totalRows: draftRows.length,
    validRows: details.filter((d) => d.valid).length,
    invalidRows: details.filter((d) => !d.valid).length,
    alreadyUploadedRows: details.filter((d) => d.alreadyUploaded).length,
    notYetUploadedRows: details.filter((d) => d.valid && !d.alreadyUploaded).length,
    details,
  };
}
