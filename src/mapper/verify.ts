/**
 * Second, independent verification crawl (npm run verify-map). Runs the
 * entire discovery + live-UI-verification pipeline again from scratch under
 * a separate checkpoint, then reconciles it against the primary mapping run
 * (output/form-map.json) so the mapping isn't accepted on a single pass.
 */
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn, LoginBlockedError } from '../auth/login';
import { logger } from '../utils/logger';
import { runDiscover } from './discover';
import { runLiveUiVerification } from './verifyLiveUi';

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'output');
const VERIFY_CHECKPOINT = 'verify-crawl';

function reconcile(primary: any, second: any) {
  const byPath = (leaves: any[]) => new Map(leaves.map((l) => [l.pathLabels.join(' > '), l]));
  const p = byPath(primary.leaves);
  const s = byPath(second.leaves);

  const onlyInPrimary = [...p.keys()].filter((k) => !s.has(k));
  const onlyInSecond = [...s.keys()].filter((k) => !p.has(k));
  const both = [...p.keys()].filter((k) => s.has(k));

  const disagreements = both
    .filter((k) => Boolean(p.get(k).uiVerified) !== Boolean(s.get(k).uiVerified))
    .map((k) => ({ path: k, firstCrawl: Boolean(p.get(k).uiVerified), secondCrawl: Boolean(s.get(k).uiVerified) }));

  const idDriftObserved = both
    .filter((k) => p.get(k).idDrift || s.get(k).idDrift)
    .map((k) => ({ path: k, firstCrawlDrift: p.get(k).idDrift ?? null, secondCrawlDrift: s.get(k).idDrift ?? null }));

  return {
    summary: {
      totalPathsFirstCrawl: primary.leaves.length,
      totalPathsSecondCrawl: second.leaves.length,
      pathsPresentInBoth: both.length,
      onlyInFirstCrawl: onlyInPrimary.length,
      onlyInSecondCrawl: onlyInSecond.length,
      disagreements: disagreements.length,
      pathsWithObservedIdDrift: idDriftObserved.length,
      reconciled: onlyInPrimary.length === 0 && onlyInSecond.length === 0 && disagreements.length === 0,
    },
    onlyInPrimary,
    onlyInSecond,
    disagreements,
    idDriftObserved,
  };
}

async function main() {
  const resume = process.argv.includes('--resume');
  const primaryPath = path.join(OUTPUT_DIR, 'form-map.json');
  if (!fs.existsSync(primaryPath)) {
    logger.error(`Primary mapping output not found at ${primaryPath}. Run "npm run map" first.`);
    process.exit(1);
  }
  const primary = JSON.parse(fs.readFileSync(primaryPath, 'utf-8'));

  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  try {
    let loginResult;
    try {
      loginResult = await ensureLoggedIn(page);
    } catch (err) {
      if (err instanceof LoginBlockedError) {
        logger.error(`BLOCKED: ${err.message}`);
        process.exitCode = 2;
        return;
      }
      throw err;
    }
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      process.exitCode = 2;
      return;
    }

    logger.info('Starting independent second crawl under a separate checkpoint...');
    const cp = await runDiscover(page, { resume, checkpointName: VERIFY_CHECKPOINT });
    await runLiveUiVerification(page, cp, VERIFY_CHECKPOINT);

    const verifiedCount = cp.leaves.filter((l) => l.uiVerified).length;
    const failedCount = cp.leaves.filter((l) => l.uiVerified === false).length;
    logger.info(`Second crawl complete: ${verifiedCount} verified, ${failedCount} failed, out of ${cp.leaves.length}.`);

    const reconciliation = reconcile(primary, cp);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'verification-reconciliation.json'), JSON.stringify(reconciliation, null, 2), 'utf-8');
    logger.info(`Reconciliation: ${JSON.stringify(reconciliation.summary)}`);
    logger.info('Wrote output/verification-reconciliation.json');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`verify-map crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
