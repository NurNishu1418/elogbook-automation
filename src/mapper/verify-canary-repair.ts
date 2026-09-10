/** READ-ONLY: verifies the exact post-repair state of the canary entry by searching ALL pages. */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { logger } from '../utils/logger';
import { authGet } from '../mapper/api';
import { env } from '../utils/env';

const CANARY_ID = 'fd5e7c1e-be81-48a4-a65a-90be12b08807';

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
    for (let p = 1; p <= 60; p++) {
      const url = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=${p}&paginate_per_page=20`;
      const r = await authGet<{ success: boolean; data: { data: any[]; last_page: number } }>(page, url);
      if (r.status !== 200 || !Array.isArray(r.body?.data?.data)) break;
      const found = r.body.data.data.find((e: any) => e.id === CANARY_ID);
      if (found) {
        logger.info(`Found canary entry on page ${p}:`);
        logger.info(JSON.stringify(found, null, 2));
        return;
      }
      if (p >= (r.body.data.last_page ?? 1)) break;
    }
    logger.error('Canary entry not found in any page.');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`verify-canary-repair crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
