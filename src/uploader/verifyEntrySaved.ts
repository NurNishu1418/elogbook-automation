import { Page } from 'playwright';
import { authGet } from '../mapper/api';
import { env } from '../utils/env';
import { DataEntryRow } from './excelReader';
import { LeafForValidation } from './validateRow';

export interface PortalEntry {
  id: string;
  logbook_entry_setup_master_id: string;
  approved_status: string;
  submit_ind: number;
  details_json: string;
  competency_group: { skill_name: string; level1: boolean; level2: boolean; level3: boolean; level4: boolean; status: boolean }[];
}

function stripDots(s: string): string {
  return s.replace(/\./g, '').trim().replace(/\s+/g, ' ');
}

/** Fetches the trainee's own entry list (read-only) across a few pages, newest first. */
export async function fetchRecentEntries(page: Page, pages = 3, perPage = 20): Promise<PortalEntry[]> {
  const all: PortalEntry[] = [];
  for (let p = 1; p <= pages; p++) {
    const url = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=${p}&paginate_per_page=${perPage}`;
    const r = await authGet<{ success: boolean; data: { data: PortalEntry[]; last_page: number } }>(page, url);
    if (r.status !== 200 || !Array.isArray(r.body?.data?.data)) break;
    all.push(...r.body.data.data);
    if (p >= (r.body.data.last_page ?? 1)) break;
  }
  return all;
}

function parseDetails(entry: PortalEntry): Record<string, any> {
  try {
    return JSON.parse(entry.details_json);
  } catch {
    return {};
  }
}

/**
 * Searches already-fetched entries for one matching this row's identifying
 * data - used BOTH as the pre-create duplicate check and as the post-save
 * lookup. Matches by Patient Reg No alone (guaranteed unique per row) -
 * NOT by leaf.leafId, because the portal's live logbook_entry_setup_master_id
 * for a leaf can drift from the mapper's cached id (see README "Discovered
 * portal quirks" / id-drift), which was causing real saved drafts to be
 * reported as "not found" and re-uploaded as duplicates.
 */
export function findMatchingEntry(entries: PortalEntry[], row: DataEntryRow, leaf: LeafForValidation): PortalEntry | null {
  for (const entry of entries) {
    const details = parseDetails(entry);
    if (details['Patient Reg No'] === row.patientRegNo) return entry;
  }
  return null;
}

export interface CompareResult {
  matches: boolean;
  mismatches: string[];
}

/** Compares every field we actually submitted against what the portal stored. */
export function compareEntryToRow(entry: PortalEntry, row: DataEntryRow, leaf: LeafForValidation): CompareResult {
  const details = parseDetails(entry);
  const mismatches: string[] = [];

  const coreChecks: [string, string][] = [
    ['Date of Assignment', row.dateOfAssignment],
    ['Name of the Patient', row.nameOfPatient],
    ['Patient Reg No', row.patientRegNo],
    ['Date of Birth', row.dateOfBirth],
    ['Age', row.age],
  ];
  for (const [field, expected] of coreChecks) {
    if (!expected) continue;
    if (String(details[field] ?? '') !== String(expected)) {
      mismatches.push(`${field}: expected "${expected}", portal has "${details[field] ?? '(missing)'}"`);
    }
  }

  for (const [key, expected] of Object.entries(row.extraFields)) {
    if (key === '__PARSE_ERROR__') continue;
    const matchField = leaf.fields.find((f) => stripDots(f.column_name) === stripDots(key));
    if (!matchField) continue;
    const actual = details[matchField.column_name];
    if (String(actual ?? '') !== String(expected)) {
      mismatches.push(`${matchField.column_name}: expected "${expected}", portal has "${actual ?? '(missing)'}"`);
    }
  }

  const actualCompetencyNames = new Set((entry.competency_group ?? []).filter((c) => c.status).map((c) => c.skill_name.trim()));
  for (const item of row.competencyItems) {
    if (!actualCompetencyNames.has(item.trim())) {
      mismatches.push(`CompetencyGroup "${item}": not present/checked in the saved entry (portal has: [${[...actualCompetencyNames].join(', ') || 'none'}])`);
    }
  }

  return { matches: mismatches.length === 0, mismatches };
}
