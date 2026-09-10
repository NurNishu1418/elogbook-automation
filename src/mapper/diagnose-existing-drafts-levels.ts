/**
 * READ-ONLY diagnostic: inspects existing portal draft entries (via the
 * already-proven trainee-log-entry-list API, read-only) to find Procedural
 * Skill entries where the main competency item is checked but no level
 * (level1..level4) is set. Does NOT open Edit Logbook Entry and does NOT
 * modify anything - this is purely a read-only census to scope the repair.
 */
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { logger } from '../utils/logger';
import { authGet } from './api';
import { env } from '../utils/env';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

interface CompetencyGroupEntry {
  skill_name: string;
  level1: boolean;
  level2: boolean;
  level3: boolean;
  level4: boolean;
  status: boolean;
}
interface PortalEntry {
  id: string;
  logbook_entry_setup_master_id: string;
  approved_status: string;
  submit_ind: number;
  details_json: string;
  competency_group: CompetencyGroupEntry[];
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      return;
    }
    logger.info('Login confirmed (read-only diagnostic).');

    const all: PortalEntry[] = [];
    for (let p = 1; p <= 30; p++) {
      const url = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=${p}&paginate_per_page=20`;
      const r = await authGet<{ success: boolean; data: { data: PortalEntry[]; last_page: number; total: number } }>(page, url);
      if (r.status !== 200 || !Array.isArray(r.body?.data?.data)) break;
      all.push(...r.body.data.data);
      if (p === 1) logger.info(`Total entries reported by portal: ${r.body.data.total}, last_page: ${r.body.data.last_page}`);
      if (p >= (r.body.data.last_page ?? 1)) break;
    }
    logger.info(`Fetched ${all.length} total entries.`);

    // Interpretative Skill entries ALSO carry a (degenerate) competency_group
    // entry from this API with status often true and level1..4 always false -
    // that is expected/correct for them (no Level concept applies). Only
    // Procedural skill leaves genuinely have selectable Levels. Cross-check
    // logbook_entry_setup_master_id against the cached mapping to tell them
    // apart, rather than assuming any checked competency_group item implies
    // a Procedural skill entry.
    const formMap = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'output', 'form-map.json'), 'utf-8'));
    const proceduralLeafIds = new Set(
      formMap.leaves.filter((l: any) => l.pathLabels?.[2] === 'Procedural skill').map((l: any) => l.leafId)
    );
    logger.info(`Known Procedural-skill leaf ids in cached mapping: ${proceduralLeafIds.size}`);

    const proceduralEntries = all.filter((e) => proceduralLeafIds.has(e.logbook_entry_setup_master_id));
    logger.info(`Entries whose leaf is a genuine Procedural skill leaf: ${proceduralEntries.length}`);
    const nonProceduralWithStatusTrue = all.filter((e) => !proceduralLeafIds.has(e.logbook_entry_setup_master_id) && (e.competency_group ?? []).some((c) => c.status));
    logger.info(`(For comparison) non-Procedural entries where the API still reports a "status:true" competency_group item (expected/benign - these are Interpretative Skill entries and must NOT be touched): ${nonProceduralWithStatusTrue.length}`);

    const proceduralWithCheckedSkill = proceduralEntries.filter((e) => (e.competency_group ?? []).some((c) => c.status));
    logger.info(`Procedural entries with at least one checked competency item: ${proceduralWithCheckedSkill.length}`);

    const missingLevel = proceduralWithCheckedSkill.filter((e) =>
      e.competency_group.some((c) => c.status && !c.level1 && !c.level2 && !c.level3 && !c.level4)
    );
    logger.info(`Entries with a checked skill but NO level selected: ${missingLevel.length}`);

    const missingLevelStillDraft = missingLevel.filter((e) => e.approved_status === 'Draft' && e.submit_ind === 0);
    const missingLevelAlreadySubmitted = missingLevel.filter((e) => !(e.approved_status === 'Draft' && e.submit_ind === 0));
    logger.info(`  of which still safely-editable Draft (approved_status=Draft, submit_ind=0): ${missingLevelStillDraft.length}`);
    logger.info(`  of which already submitted/approved (OUT OF SCOPE - must NOT be touched): ${missingLevelAlreadySubmitted.length}`);

    const multiLevelChecked = proceduralWithCheckedSkill.filter((e) =>
      e.competency_group.some((c) => c.status && [c.level1, c.level2, c.level3, c.level4].filter(Boolean).length > 1)
    );
    logger.info(`Entries with a checked skill but MORE THAN ONE level selected: ${multiLevelChecked.length}`);

    const correctlyLeveled = proceduralWithCheckedSkill.filter((e) =>
      e.competency_group.every((c) => !c.status || [c.level1, c.level2, c.level3, c.level4].filter(Boolean).length === 1)
    );
    logger.info(`Entries where every checked skill has EXACTLY one level: ${correctlyLeveled.length}`);

    logger.info('\n--- Sample of entries missing a level (up to 5) ---');
    for (const e of missingLevel.slice(0, 5)) {
      let details: any = {};
      try {
        details = JSON.parse(e.details_json);
      } catch {
        /* ignore */
      }
      const checkedSkills = e.competency_group.filter((c) => c.status).map((c) => c.skill_name);
      logger.info(
        JSON.stringify({
          id: e.id,
          logbook_entry_setup_master_id: e.logbook_entry_setup_master_id,
          patientRegNo: details['Patient Reg No'],
          patientName: details['Name of the Patient'],
          assignmentDate: details['Date of Assignment'],
          checkedSkills,
          approved_status: e.approved_status,
          submit_ind: e.submit_ind,
        })
      );
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`diagnose-existing-drafts-levels crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
