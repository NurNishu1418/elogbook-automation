import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
dotenv.config();

const LOGBOOK_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 30 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const username = process.env.BCPS_USERNAME!;
  const password = process.env.BCPS_PASSWORD!;
  const userType = process.env.BCPS_USER_TYPE || 'Trainee';

  let totalSubmitted = 0;
  let totalFailed = 0;
  let consecutiveFailures = 0;

  try {
    logger.info('='.repeat(60));
    logger.info('SUBMIT ALL DRAFT ENTRIES');
    logger.info('='.repeat(60));

    // Direct login
    await page.goto('https://eportal.bcps.edu.bd/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(1500);
    const sel = await page.$('select[name="login_type"]');
    if (sel) await page.selectOption('select[name="login_type"]', { label: userType });
    await delay(500);
    logger.info(`Logging in as ${username} (${userType})...`);
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);
    await delay(2000);
    if (page.url().includes('/login')) {
      const alerts = await page.locator('.alert, .text-danger, [role="alert"]').allTextContents().catch(() => [] as string[]);
      throw new Error(`Login failed: ${alerts.join(' | ') || 'unknown reason'}`);
    }
    logger.info('Login OK');

    // Go to logbook entry list
    await page.goto(LOGBOOK_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);
    logger.info(`Page URL: ${page.url()}`);

    // Filter by Draft status
    const statusSelect = page.locator('select[name="approved_status"]').first();
    if (await statusSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await statusSelect.selectOption('Draft');
      await delay(300);
      logger.info('Draft filter set');
    }

    // Click Search
    const searchBtn = page.locator('button:has-text("Search")').first();
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click();
      await delay(3000);
    }

    // Submit all drafts — always click first Edit button
    while (true) {
      const editBtn = page.locator('button:has-text("Edit")').first();
      const hasEdit = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasEdit) {
        logger.info('No more Edit buttons. All drafts submitted!');
        break;
      }

      const entryNum = totalSubmitted + totalFailed + 1;
      logger.info(`[${entryNum}] Clicking Edit...`);

      try {
        await editBtn.click();
        await delay(2000);

        // Click Submit in modal
        const submitBtn = page.locator('button:has-text("Submit")').first();
        const submitVisible = await submitBtn.isVisible({ timeout: 5000 }).catch(() => false);

        if (!submitVisible) {
          throw new Error('Submit button not visible in modal');
        }

        await submitBtn.click();
        await delay(2000);

        // Handle confirmation
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("OK")').first();
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
          await delay(2000);
        }

        // Close modal if still open
        const closeBtn = page.locator('button.btn-close, button:has-text("Close")').first();
        if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeBtn.click();
          await delay(1000);
        }

        totalSubmitted++;
        consecutiveFailures = 0;
        logger.info(`  -> SUBMITTED (#${totalSubmitted})`);

      } catch (err: any) {
        totalFailed++;
        consecutiveFailures++;
        logger.error(`  -> FAILED: ${err?.message ?? err}`);

        const closeBtn = page.locator('button.btn-close, button:has-text("Close")').first();
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click();
          await delay(1000);
        }

        if (consecutiveFailures >= 10) {
          logger.error('10 consecutive failures — stopping.');
          break;
        }
      }
    }

  } catch (error: any) {
    logger.error(`Crashed: ${error?.stack ?? error}`);
  } finally {
    logger.info('='.repeat(60));
    logger.info(`DONE: ${totalSubmitted} submitted, ${totalFailed} failed`);
    logger.info('='.repeat(60));
    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal:', err);
  process.exit(1);
});
