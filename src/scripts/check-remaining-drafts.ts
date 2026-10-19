import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';

const DRAFT_LIST_URL = process.env.DRAFT_LIST_URL
  || 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1791186751447';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  try {
    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');

    await page.goto(DRAFT_LIST_URL, { waitUntil: 'domcontentloaded' });
    await delay(2500);

    // Filter by Draft
    await page.locator('select[name="approved_status"]').first().selectOption({ label: 'Draft' });
    await page.locator('button:has-text("Search")').first().click();
    await delay(3000);

    // Check count from pagination text (e.g. "1-10 of 538")
    const bodyText = await page.locator('body').innerText();
    const countMatch = bodyText.match(/(\d+)\s*-\s*(\d+)\s+of\s+(\d+)/);
    if (countMatch) {
      logger.info(`Drafts remaining: ${countMatch[3]} (showing ${countMatch[1]}-${countMatch[2]})`);
    } else {
      logger.info('No pagination count found — likely 0 drafts remaining.');
    }

    const editBtns = await page.locator('button:has-text("Edit")').count();
    logger.info(`Edit buttons visible: ${editBtns}`);

    await page.screenshot({ path: 'screenshots/remaining-drafts-check.png', fullPage: true });

  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(err => { logger.error(err); process.exit(1); });
