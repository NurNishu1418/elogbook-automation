/**
 * READ-ONLY test: does the filtered trainee-log-entry-list endpoint
 * (discovered via network capture of the Search button) accept a large
 * paginate_per_page, and does it return full entry data (including id and
 * competency_group) in the same order the UI table displays? If so, this
 * becomes THE provably-unique, DOM-free way to target a specific existing
 * Draft entry by its own entry ID for editing - no ambiguous text match
 * needed at all.
 */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { authGet } from '../mapper/api';
import { logger } from '../utils/logger';
import { env } from '../utils/env';

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
    logger.info('Login confirmed (read-only).');

    const targetId = 'b4975eef-6510-49b8-9370-902ecccd0717';
    let found = false;
    for (let p = 1; p <= 19; p++) {
      const url = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=${p}&paginate_per_page=10&heading=${encodeURIComponent('Procedural and Interpretative Skills')}&approved_status=Draft`;
      const r = await authGet<{ success: boolean; data: { data: any[]; total: number; last_page: number } }>(page, url);
      const idx = r.body.data.data.findIndex((e: any) => e.id === targetId);
      if (idx !== -1) {
        logger.info(`FOUND target ${targetId} on filtered-list page ${p}, 0-based index ${idx} (1-based row ${idx + 1})`);
        found = true;
        break;
      }
    }
    if (!found) logger.error(`Target ${targetId} not found in any of the 19 filtered pages.`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`test-filtered-endpoint crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
