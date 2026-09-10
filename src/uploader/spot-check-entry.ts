import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { fetchRecentEntries } from './verifyEntrySaved';
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
  const entries = await fetchRecentEntries(page, 3, 20);
  const targetRegNos = ['6193/85', '6689/74', '5509/76', '9706/19', '9260/47'];
  for (const e of entries) {
    if (!targetRegNos.some((r) => e.details_json.includes(r))) continue;
    console.log('id:', e.id, 'setup_master_id:', e.logbook_entry_setup_master_id, 'status:', e.approved_status, 'submit_ind:', e.submit_ind);
    console.log('details_json:', e.details_json);
    console.log('competency_group:', JSON.stringify(e.competency_group));
    console.log('---');
  }
  await browser.close();
}

main().catch((err) => {
  logger.error(`spot-check-entry crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
