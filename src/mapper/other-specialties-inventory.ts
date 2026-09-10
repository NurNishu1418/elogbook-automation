/**
 * READ-ONLY inventory of editable Drafts across ALL specialties EXCEPT
 * Basic Surgical Skill (owned by a parallel repair effort) and excluding
 * true Vascular Surgery leaves (never touched per long-standing project
 * safety rule - genuine portal-routing bug, held indefinitely). Issues
 * GET requests only. Used to scope and prioritize the next specialties
 * (Thoracic and Cardiovascular Surgery first) for prepared, not-yet-live
 * corrections.
 */
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { authGet } from './api';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'output', 'other-specialties-inventory.json');

const EXCLUDED_CASE_TYPES = new Set(['Basic Surgical Skill', 'Vascular Surgery']);

interface CompetencyGroupEntry {
  skill_name: string;
  level1: boolean;
  level2: boolean;
  level3: boolean;
  level4: boolean;
  status: boolean;
}
interface RawPortalEntry {
  id: string;
  logbook_entry_setup_master_id: string;
  approved_status: string;
  submit_ind: number;
  details_json: string;
  competency_group: CompetencyGroupEntry[];
}

function parseDetails(entry: RawPortalEntry): Record<string, any> {
  try {
    return JSON.parse(entry.details_json);
  } catch {
    return {};
  }
}

async function fetchAllEntries(page: any): Promise<RawPortalEntry[]> {
  const all: RawPortalEntry[] = [];
  for (let p = 1; p <= 80; p++) {
    const url = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=${p}&paginate_per_page=20`;
    const r = await authGet<{ success: boolean; data: { data: RawPortalEntry[]; last_page: number } }>(page, url);
    if (r.status !== 200 || !Array.isArray(r.body?.data?.data)) break;
    all.push(...r.body.data.data);
    if (p >= (r.body.data.last_page ?? 1)) break;
  }
  return all;
}

async function main() {
  const formMap = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'output', 'form-map.json'), 'utf-8'));
  const leafById = new Map<string, { pathLabels: string[]; competencyGroup: any[] }>();
  for (const leaf of formMap.leaves ?? []) {
    leafById.set(leaf.leafId, { pathLabels: leaf.pathLabels, competencyGroup: leaf.competencyGroup ?? [] });
  }

  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      process.exit(2);
    }
    logger.info('Login confirmed. READ-ONLY: GET requests only, zero form opened, zero checkbox touched, zero Save.');

    const entries = await fetchAllEntries(page);
    logger.info(`Fetched ${entries.length} total portal entries (all statuses, all specialties).`);

    const drafts = entries.filter((e) => e.approved_status === 'Draft' && e.submit_ind === 0);
    logger.info(`Total editable Drafts (all specialties): ${drafts.length}`);

    const bySpecialty: Record<string, { caseType: string; skillType: string; count: number; entryIds: string[] }> = {};
    for (const e of drafts) {
      const leaf = leafById.get(e.logbook_entry_setup_master_id);
      const caseType = leaf?.pathLabels?.[1] ?? 'UNKNOWN';
      const skillType = leaf?.pathLabels?.[2] ?? 'UNKNOWN';
      if (EXCLUDED_CASE_TYPES.has(caseType)) continue;
      const key = `${caseType} > ${skillType}`;
      if (!bySpecialty[key]) bySpecialty[key] = { caseType, skillType, count: 0, entryIds: [] };
      bySpecialty[key].count++;
      bySpecialty[key].entryIds.push(e.id);
    }

    const summary = Object.entries(bySpecialty)
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.count - a.count);

    logger.info(`\nEditable Draft counts by specialty (excluding Basic Surgical Skill and Vascular Surgery):`);
    summary.forEach((s) => logger.info(`${s.key}: ${s.count}`));

    fs.writeFileSync(
      OUTPUT_PATH,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          totalPortalEntriesScanned: entries.length,
          totalEditableDraftsAllSpecialties: drafts.length,
          excludedCaseTypes: [...EXCLUDED_CASE_TYPES],
          bySpecialty: summary,
        },
        null,
        2
      ),
      'utf-8'
    );
    logger.info(`\nInventory written to ${OUTPUT_PATH}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`other-specialties-inventory crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
