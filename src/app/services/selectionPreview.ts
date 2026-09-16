import { readDataEntryRows, readExistingUploadResults } from '../../uploader/excelReader';
import { validateRow } from '../../uploader/validateRow';
import { selectEligibleRows, readLastAttemptStatus, SelectionMode } from '../../uploader/selection';
import { loadLeaves } from './dryRunService';

export interface ResolveSelectionParams {
  workbookPath: string;
  selectionMode: SelectionMode;
  selectedRowIds?: string[];
  rangeStart?: number;
  rangeEnd?: number;
}

export interface ResolvedSelection {
  workbookPath: string;
  selectionMode: SelectionMode;
  rangeStart: number | null;
  rangeEnd: number | null;
  resolvedCount: number;
  externalRowIds: string[];
  firstExternalRowId: string | null;
  lastExternalRowId: string | null;
  caseTypesRepresented: string[];
  invalidRowsInScope: number;
}

/**
 * Resolves EXACTLY which rows a job would touch for a given selection,
 * using the same selectEligibleRows() the live runner (run-workbook.ts)
 * itself uses - so this preview can never diverge from what actually gets
 * processed. Local-only: no login, no browser launched.
 */
export async function resolveSelection(params: ResolveSelectionParams): Promise<ResolvedSelection> {
  const leaves = loadLeaves();
  const allRows = await readDataEntryRows(params.workbookPath);
  const draftRows = allRows.filter((r) => r.action === 'SAVE_DRAFT');
  const validationResults = draftRows.map((row) => ({ row, result: validateRow(row, leaves) }));
  const validRows = validationResults.filter((v) => v.result.valid);

  const alreadyDoneLocally = await readExistingUploadResults(params.workbookPath);
  const lastAttemptStatus = await readLastAttemptStatus(params.workbookPath);

  const rangeStart = params.rangeStart ?? null;
  const rangeEnd = params.rangeEnd ?? null;

  const eligible = selectEligibleRows(validRows, params.selectionMode, {
    selectedRowIds: params.selectedRowIds,
    rangeStart,
    rangeEnd,
    alreadyDoneLocally,
    lastAttemptStatus,
  }).filter((v) => !alreadyDoneLocally.has(v.row.externalRowId));

  const externalRowIds = eligible.map((v) => v.row.externalRowId);
  const caseTypesRepresented = [...new Set(eligible.map((v) => v.row.caseType))];

  // Invalid rows that fall within the requested scope (informational - the
  // resolvedCount above already excludes them; this tells the caller how
  // many were excluded specifically for failing local validation, vs. for
  // being already-done or out of range).
  let invalidRowsInScope = 0;
  if (params.selectionMode === 'range') {
    invalidRowsInScope = validationResults.filter(
      (v) =>
        !v.result.valid &&
        (rangeStart == null || v.row.excelRow >= rangeStart) &&
        (rangeEnd == null || v.row.excelRow <= rangeEnd)
    ).length;
  }

  return {
    workbookPath: params.workbookPath,
    selectionMode: params.selectionMode,
    rangeStart,
    rangeEnd,
    resolvedCount: eligible.length,
    externalRowIds,
    firstExternalRowId: externalRowIds[0] ?? null,
    lastExternalRowId: externalRowIds[externalRowIds.length - 1] ?? null,
    caseTypesRepresented,
    invalidRowsInScope,
  };
}
