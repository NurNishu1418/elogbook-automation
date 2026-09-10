/**
 * READ-ONLY detail fetch for the 13 non-Basic-Surgical-Skill,
 * non-Vascular-Surgery editable Drafts identified by
 * other-specialties-inventory.ts. GET requests only.
 */
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { authGet } from './api';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'output', 'other-specialties-detail.json');

async function fetchAllEntries(page: any): Promise<any[]> {
  const all: any[] = [];
  for (let p = 1; p <= 80; p++) {
    const url = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=${p}&paginate_per_page=20`;
    const r = await authGet<{ success: boolean; data: { data: any[]; last_page: number } }>(page, url);
    if (r.status !== 200 || !Array.isArray(r.body?.data?.data)) break;
    all.push(...r.body.data.data);
    if (p >= (r.body.data.last_page ?? 1)) break;
  }
  return all;
}

async function main() {
  const inv = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'output', 'other-specialties-inventory.json'), 'utf-8'));
  const targetIds = new Set<string>();
  for (const s of inv.bySpecialty) for (const id of s.entryIds) targetIds.add(id);
  logger.info(`Fetching detail for ${targetIds.size} target entries.`);

  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();
  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      process.exit(2);
    }
    logger.info('Login confirmed. READ-ONLY.');

    const entries = await fetchAllEntries(page);
    const targets = entries.filter((e) => targetIds.has(e.id));
    logger.info(`Found ${targets.length}/${targetIds.size} targets.`);

    const detailed = targets.map((e) => {
      let details: any = {};
      try {
        details = JSON.parse(e.details_json);
      } catch {}
      return {
        entryId: e.id,
        leafId: e.logbook_entry_setup_master_id,
        approvedStatus: e.approved_status,
        submitInd: e.submit_ind,
        competencyGroup: (e.competency_group ?? []).map((c: any) => ({ skill: c.skill_name, level1: c.level1, level2: c.level2, level3: c.level3, level4: c.level4, status: c.status })),
        details,
      };
    });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), count: detailed.length, entries: detailed }, null, 2), 'utf-8');
    logger.info(`Detail written to ${OUTPUT_PATH}`);
    logger.info(JSON.stringify(detailed, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`other-specialties-detail-fetch crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
