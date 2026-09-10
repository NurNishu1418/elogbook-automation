/**
 * Batch driver for the approved repair of the 17 remaining Basic Surgical
 * Skill > Procedural skill > "Intravenous cannulation" Drafts that
 * currently have zero competency level checked. Intravenous cannulation
 * allows Level 4 ONLY, so this needs no clinical-context judgment at all -
 * exactly analogous to the earlier 2 already-completed canaries.
 *
 * Safety properties (all inherited from repair-procedural-levels.ts /
 * portalRowLocator.ts, already proven via 2 verified live canaries plus a
 * 17/17 read-only row-targeting proof run):
 *   - row targeting is by exact (page, index) position resolved from the
 *     portal's own Draft-filtered API response - never by ambiguous
 *     date/case-type text matching (the earlier failure mode)
 *   - a fresh runAudit() call before EVERY repair re-verifies live state
 *   - repairOneEntry() re-checks: correct entry opened (checked skill
 *     matches, frozen fields match), zero levels currently checked,
 *     checks exactly Level 4, verifies skill still checked, "Save as
 *     Draft" only (never "Submit"), re-fetches via the portal's own API
 *     afterward and verifies level + all other fields unchanged
 *   - sequential, concurrency 1
 *   - halts the entire batch immediately on the first unexpected result
 */
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { logger } from '../utils/logger';
import { runAudit, repairOneEntry, AuditRow } from './repair-procedural-levels';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const BATCH_REPORT_PATH = path.join(PROJECT_ROOT, 'output', 'repair-batch-basic-surgical-iv-cannulation-report.json');

const TARGET_IDS = [
  'b4975eef-6510-49b8-9370-902ecccd0717',
  'e245bfad-51de-4dc3-b17f-eba007d47c64',
  '20e89947-89f4-40a7-b682-0be7e9d3e932',
  '3e21450f-fd65-4e5c-9336-28244339c07f',
  'acb4bd11-fd93-40d8-9901-c761bb74c829',
  '57037a8e-df7a-44c3-9470-2109dd6ac92b',
  '3f1af7ab-78c3-4628-90ab-fc3938c0f682',
  'd1775296-cb22-4f5b-ba64-79e5b3acbdd0',
  '7f2ebefc-622d-409d-b890-b501b13479e6',
  '3a082e3f-978c-4d8b-bffb-ad15976c8ea2',
  '4526aa25-e8be-4fa3-a7b4-548fb4eef0f4',
  'e5b4c617-597f-4a4f-9bf6-b9924d235281',
  '790925b7-5900-4f1b-898c-2d041398012f',
  '5080b48c-aec3-423b-bc37-d4c9778892c4',
  '93af3fda-591c-4116-b1c6-45b2f47fb90c',
  '244203e4-b8da-4538-8a93-336f9bda9863',
  '878080d7-f582-474b-8bf5-76c04e3dc24f',
];

interface BatchResult {
  entryId: string;
  outcome: 'REPAIRED_AND_VERIFIED' | 'SKIPPED_STALE_CLASSIFICATION' | 'FAILED';
  detail: string;
}

async function main() {
  logger.info(`Targeting ${TARGET_IDS.length} Basic Surgical Skill > Intravenous cannulation Drafts (Level 4 only, zero currently checked).`);

  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  const results: BatchResult[] = [];

  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      process.exit(2);
    }
    logger.info('Login confirmed.');

    for (let i = 0; i < TARGET_IDS.length; i++) {
      const entryId = TARGET_IDS[i];
      logger.info(`\n########## [${i + 1}/${TARGET_IDS.length}] Processing entry ${entryId} ##########`);

      const auditRows: AuditRow[] = await runAudit(page);
      const target = auditRows.find((r) => r.entryId === entryId);

      if (!target) {
        const detail = `Entry ${entryId} not found in a fresh audit re-fetch. Skipping - not touched.`;
        logger.error(detail);
        results.push({ entryId, outcome: 'SKIPPED_STALE_CLASSIFICATION', detail });
        continue;
      }
      if (target.classification !== 'AUTO_FIXABLE_SINGLE_LEVEL' || target.checkedSkill !== 'Intravenous cannulation' || target.caseType !== 'Basic Surgical Skill') {
        const detail = `Entry ${entryId} no longer matches expected scope in a fresh re-audit (classification=${target.classification}, skill=${target.checkedSkill}, caseType=${target.caseType}). Skipping - not touched, never guessing.`;
        logger.error(detail);
        results.push({ entryId, outcome: 'SKIPPED_STALE_CLASSIFICATION', detail });
        continue;
      }

      try {
        await repairOneEntry(page, target);
        results.push({ entryId, outcome: 'REPAIRED_AND_VERIFIED', detail: `Level ${target.resolvedLevel} set and verified for "${target.checkedSkill}".` });
      } catch (err: any) {
        const detail = `Repair failed for entry ${entryId}: ${err?.message ?? err}`;
        logger.error(detail);
        results.push({ entryId, outcome: 'FAILED', detail });
        logger.error('STOPPING BATCH IMMEDIATELY due to an unexpected result. No further entries in this batch will be attempted.');
        break;
      }
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync(
    BATCH_REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalTargeted: TARGET_IDS.length,
        totalProcessed: results.length,
        repaired: results.filter((r) => r.outcome === 'REPAIRED_AND_VERIFIED').length,
        skipped: results.filter((r) => r.outcome === 'SKIPPED_STALE_CLASSIFICATION').length,
        failed: results.filter((r) => r.outcome === 'FAILED').length,
        results,
      },
      null,
      2
    ),
    'utf-8'
  );
  logger.info(`\nBatch report written to ${BATCH_REPORT_PATH}`);
  logger.info(
    `Summary: repaired=${results.filter((r) => r.outcome === 'REPAIRED_AND_VERIFIED').length}, skipped=${results.filter((r) => r.outcome === 'SKIPPED_STALE_CLASSIFICATION').length}, failed=${results.filter((r) => r.outcome === 'FAILED').length}, targeted=${TARGET_IDS.length}`
  );
}

main().catch((err) => {
  logger.error(`repair-batch-basic-surgical-iv-cannulation crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
