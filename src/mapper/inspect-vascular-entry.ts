/**
 * READ-ONLY inspection of the single genuine Vascular Surgery Procedural
 * leaf entry, to determine its current level state and full case content
 * before considering any level decision. Issues GET requests only.
 */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { authGet } from './api';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

const TARGET_ID = '2290ae2a-9ed6-4cd0-823e-a4eae4580ca4';

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
    logger.info('Login confirmed. Read-only GET requests only.');
    for (let p = 1; p <= 60; p++) {
      const url = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=${p}&paginate_per_page=20`;
      const r = await authGet<{ success: boolean; data: { data: any[]; last_page: number } }>(page, url);
      if (r.status !== 200 || !Array.isArray(r.body?.data?.data)) break;
      const found = r.body.data.data.find((e: any) => e.id === TARGET_ID);
      if (found) {
        logger.info(`FOUND on page ${p}`);
        logger.info(JSON.stringify(found, null, 2));
        return;
      }
      if (p >= (r.body.data.last_page ?? 1)) break;
    }
    logger.error('Entry not found in any page.');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`inspect-vascular-entry crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
