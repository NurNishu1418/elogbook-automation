/**
 * READ-ONLY diagnostic: how many <select> elements exist in the Logbook
 * Entry list's search/filter form, and what are their labels/options?
 * Checking whether a Case Type filter exists that has not been used yet,
 * which would eliminate cross-specialty position drift at the source.
 */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
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

    await page.goto(`${env.baseUrl}/trainee/logbook-entry`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.locator('select').first().selectOption({ label: 'Procedural and Interpretative Skills' });
    await page.waitForTimeout(500);

    const selects = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('select'));
      return els.map((el, i) => ({
        index: i,
        name: el.getAttribute('name'),
        id: el.id,
        options: Array.from(el.options).map((o) => o.textContent?.trim()),
      }));
    });
    logger.info(`Selects present after choosing the Form dropdown: ${JSON.stringify(selects, null, 2)}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`diagnose-search-form-selects crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
