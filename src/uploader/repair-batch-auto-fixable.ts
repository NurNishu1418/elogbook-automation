/**
 * Batch driver for the already-approved AUTO_FIXABLE_SINGLE_LEVEL repair.
 *
 * Scope, per explicit user approval: ONLY entries whose classification is
 * AUTO_FIXABLE_SINGLE_LEVEL (exactly one mapped valid level, currently zero
 * levels checked). NEEDS_DECISION_MULTIPLE_LEVELS (114 entries) and
 * VASCULAR_HOLD are NEVER touched by this script - repairOneEntry() itself
 * refuses to act on anything but AUTO_FIXABLE_SINGLE_LEVEL, so this is
 * enforced twice (here and inside the shared function).
 *
 * Safety properties (all inherited from repair-procedural-levels.ts,
 * already proven via 2 verified live canaries):
 *   - re-verifies live state via a FRESH runAudit() call before EVERY
 *     single repair (never trusts a stale list, even across loop
 *     iterations within this same run)
 *   - only proceeds if the fresh audit still classifies the target as
 *     AUTO_FIXABLE_SINGLE_LEVEL (if something changed the record between
 *     iterations, this script skips it and records why, rather than
 *     forcing a stale decision)
 *   - repairOneEntry() itself re-checks: correct entry opened (checked
 *     skill matches, and is the ONLY checked skill), zero levels currently
 *     checked, checks exactly the resolved level, verifies skill still
 *     checked, clicks "Save as Draft" only (never "Submit"), re-fetches via
 *     the portal's own API afterward and verifies level + all other fields
 *     unchanged
 *   - sequential, concurrency 1 - one entry fully verified before the next
 *     is even looked up
 *   - STOPS THE ENTIRE BATCH immediately on the first unexpected result
 *     (thrown error propagates out of the loop) - no partial-failure
 *     continuation, no guessing, no retry-with-different-assumptions
 */
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { logger } from '../utils/logger';
import { runAudit, repairOneEntry, AuditRow } from './repair-procedural-levels';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const RECONCILIATION_PATH = path.join(PROJECT_ROOT, 'output', 'vascular-reconciliation-audit.json');
const BATCH_REPORT_PATH = path.join(PROJECT_ROOT, 'output', 'repair-batch-auto-fixable-report.json');

interface BatchResult {
  entryId: string;
  outcome: 'REPAIRED_AND_VERIFIED' | 'SKIPPED_STALE_CLASSIFICATION' | 'FAILED';
  detail: string;
}

async function main() {
  const reconciliation = JSON.parse(fs.readFileSync(RECONCILIATION_PATH, 'utf-8'));
  const targetIds: string[] = reconciliation.draftOnlyReconciliation?.idsByCategory?.AUTO_FIXABLE_SINGLE_LEVEL ?? [];
  if (targetIds.length === 0) {
    logger.error('No AUTO_FIXABLE_SINGLE_LEVEL entry IDs found in the reconciliation file. Nothing to do.');
    return;
  }
  logger.info(`Loaded ${targetIds.length} approved AUTO_FIXABLE_SINGLE_LEVEL entry IDs from ${RECONCILIATION_PATH}.`);
  logger.info(`Target entry IDs: ${JSON.stringify(targetIds)}`);

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

    for (let i = 0; i < targetIds.length; i++) {
      const entryId = targetIds[i];
      logger.info(`\n########## [${i + 1}/${targetIds.length}] Processing entry ${entryId} ##########`);

      // Fresh live re-audit before EVERY repair - never reuse a prior
      // iteration's classification, even within this same batch run.
      const auditRows: AuditRow[] = await runAudit(page);
      const target = auditRows.find((r) => r.entryId === entryId);

      if (!target) {
        const detail = `Entry ${entryId} was not found in a fresh audit re-fetch (may have been edited/removed since the reconciliation snapshot). Skipping - not touched.`;
        logger.error(detail);
        results.push({ entryId, outcome: 'SKIPPED_STALE_CLASSIFICATION', detail });
        continue;
      }
      if (target.classification !== 'AUTO_FIXABLE_SINGLE_LEVEL') {
        const detail = `Entry ${entryId} no longer classifies as AUTO_FIXABLE_SINGLE_LEVEL in a fresh re-audit (now: ${target.classification}). Skipping - not touched, never guessing.`;
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
        totalTargeted: targetIds.length,
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
    `Summary: repaired=${results.filter((r) => r.outcome === 'REPAIRED_AND_VERIFIED').length}, skipped=${results.filter((r) => r.outcome === 'SKIPPED_STALE_CLASSIFICATION').length}, failed=${results.filter((r) => r.outcome === 'FAILED').length}, targeted=${targetIds.length}`
  );
}

main().catch((err) => {
  logger.error(`repair-batch-auto-fixable crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
