/**
 * READ-ONLY verification script: logs in, opens the trainee's logbook entry
 * listing page, captures its own AJAX list-loading API response, and checks
 * whether the synthetic test row (patient name / reg no) from
 * synthetic-iv-cannulation.ts actually exists. Never fills or submits
 * anything.
 */
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext, settle } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

const SEARCH_TEXT = 'Synthetic Test Patient 01';
const SEARCH_REGNO = 'TEST-IVC-0001';

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  const captured: { url: string; status: number; body: string }[] = [];
  page.on('response', async (response) => {
    const req = response.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return;
    let body = '';
    try {
      body = await response.text();
    } catch {
      body = '';
    }
    captured.push({ url: response.url(), status: response.status(), body });
  });

  const loginResult = await ensureLoggedIn(page);
  if (!loginResult.success) {
    logger.error(`Login failed: ${loginResult.reason}`);
    await browser.close();
    process.exit(1);
  }
  logger.info('Login confirmed (read-only session, no form actions will be performed).');

  const url = `${env.baseUrl}/trainee/logbook-entry`;
  logger.info(`Navigating (read-only) to ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await settle(page, 3000);
  await page.waitForTimeout(2000); // extra grace period for any list AJAX call

  const bodyText = await page.locator('body').innerText().catch(() => '');
  const foundNameInDom = bodyText.includes(SEARCH_TEXT);
  const foundRegNoInDom = bodyText.includes(SEARCH_REGNO);
  logger.info(`DOM text check on ${url}: foundPatientName=${foundNameInDom}, foundRegNo=${foundRegNoInDom}`);

  const outDir = path.resolve(__dirname, '..', '..', 'output');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'verify-draft-network-capture.json'), JSON.stringify(captured, null, 2), 'utf-8');
  logger.info(`Captured ${captured.length} XHR/fetch calls on this page.`);
  captured.forEach((c) => logger.info(`  ${c.status} ${c.url}`));

  let foundInApi = false;
  for (const c of captured) {
    if (c.body.includes(SEARCH_TEXT) || c.body.includes(SEARCH_REGNO)) {
      foundInApi = true;
      logger.info(`MATCH in API response: ${c.url}`);
      const idx = c.body.indexOf(SEARCH_TEXT) !== -1 ? c.body.indexOf(SEARCH_TEXT) : c.body.indexOf(SEARCH_REGNO);
      logger.info(`Context: ...${c.body.slice(Math.max(0, idx - 150), idx + 250)}...`);
    }
  }

  const screenshotPath = path.join(outDir, '..', 'screenshots', `verify-draft-listing-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  logger.info(`Screenshot of listing page saved: ${screenshotPath}`);

  logger.info(`FINAL VERIFICATION RESULT: draft found in DOM=${foundNameInDom || foundRegNoInDom}, found in API response=${foundInApi}`);

  await browser.close();
}

main().catch((err) => {
  logger.error(`verify-draft-created crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
