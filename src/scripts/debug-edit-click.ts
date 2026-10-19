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
    logger.info('Login OK');

    await page.goto(DRAFT_LIST_URL, { waitUntil: 'domcontentloaded' });
    await delay(2500);

    // Filter by Draft
    await page.locator('select[name="approved_status"]').first().selectOption({ label: 'Draft' });
    await page.locator('button:has-text("Search")').first().click();
    await delay(3000);

    logger.info(`URL before Edit click: ${page.url()}`);

    // Click first Edit button
    const editBtn = page.locator('button:has-text("Edit")').first();
    await editBtn.click();
    await delay(3000);

    logger.info(`URL after Edit click: ${page.url()}`);

    // Screenshot after clicking Edit
    await page.screenshot({ path: 'screenshots/after-edit-click.png', fullPage: true });
    logger.info('Screenshot saved: after-edit-click.png');

    // Check for Submit button
    const submitBtn = page.locator('button:has-text("Submit")');
    const submitCount = await submitBtn.count();
    logger.info(`Submit buttons found: ${submitCount}`);

    // Check all buttons visible
    const allBtns = await page.locator('button').all();
    for (let i = 0; i < allBtns.length; i++) {
      const text = await allBtns[i].textContent().catch(() => '?');
      const visible = await allBtns[i].isVisible().catch(() => false);
      if (visible) logger.info(`  Visible button[${i}]: "${text?.trim().substring(0, 60)}"`);
    }

  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(err => { logger.error(err); process.exit(1); });
