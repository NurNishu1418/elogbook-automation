/** READ-ONLY: confirms the portal's own total_min_target for Disorders of the Breast. */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { authGet } from './api';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();
  const loginResult = await ensureLoggedIn(page);
  if (!loginResult.success) {
    logger.error(`Login failed: ${loginResult.reason}`);
    await browser.close();
    process.exit(1);
  }

  const meResult = await authGet(page, `${env.baseUrl}/api/auth/v1/me/`);
  const userId = meResult.body?.data?.id;
  const sessionResult = await authGet(page, `${env.baseUrl}/api/auth/elogbook-management/v1/user-slot-info/${userId}`);
  const sessionId = sessionResult.body?.data?.[0]?.id ?? sessionResult.body?.data?.session_id;

  const url = `${env.baseUrl}/api/auth/elogbook-management/v1/logbook-entry-report-by-from/4001827b-e019-4eba-888b-dd257b85ca07?user_id=${userId}&session_id=${sessionId ?? ''}`;
  const r = await authGet(page, url);
  const data = r.body?.data ?? [];
  const breast = data.find((x: any) => x.particulars && x.particulars.includes('Disorders of the Breast'));
  if (!breast) {
    logger.error('Disorders of the Breast not found in report. Available case types: ' + data.map((x: any) => x.particulars).join(', '));
  } else {
    logger.info(`Case type total_min_target: ${breast.total_min_target}`);
    for (const st of breast.entry_setup_master_for_log) {
      logger.info(`  ${st.particulars}: total_min_target=${st.total_min_target}`);
    }
  }

  await browser.close();
}

main().catch((err) => {
  logger.error(`verify-breast-quota crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
