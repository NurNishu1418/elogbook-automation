import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
dotenv.config();

const LOGBOOK_URL = 'https://eportal.bcps.edu.bd/supervisor/logbook?ref=1791688104222';
const BMDC_NO = '118632';
const TARGET_COUNT = 99999;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 30 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const username = process.env.BCPS_USERNAME!;
  const password = process.env.BCPS_PASSWORD!;
  const userType = 'Supervisor';

  let totalApproved = 0;
  let totalFailed = 0;
  let consecutiveFailures = 0;

  try {
    logger.info('='.repeat(60));
    logger.info(`APPROVE ENTRIES: bmDC ${BMDC_NO} — target ${TARGET_COUNT}`);
    logger.info('='.repeat(60));

    // Login
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
    logger.info(`After login URL: ${page.url()}`);
    if (page.url().includes('/login')) {
      const alerts = await page.locator('.alert, .text-danger, [role="alert"]').allTextContents().catch(() => [] as string[]);
      throw new Error(`Login failed: ${alerts.join(' | ') || 'unknown reason'}`);
    }
    logger.info('Login OK');

    // Navigate to supervisor logbook
    await page.goto(LOGBOOK_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);

    // Fill bmDC search and click Search (keep default 10 per page)
    logger.info(`Searching for bmDC: ${BMDC_NO}...`);
    await page.fill('input[name="bmdc_reg_no"]', BMDC_NO);
    await delay(300);
    await page.click('button:has-text("Search")');
    await delay(3000);

    // Keep clicking first View button — approved entries auto-disappear
    while (totalApproved < TARGET_COUNT) {
      const firstView = page.locator('button.btn-info.btn-sm').first();
      const hasView = await firstView.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasView) {
        logger.info('No more View buttons. All done!');
        break;
      }

      const entryNum = totalApproved + totalFailed + 1;
      logger.info(`[${entryNum}] Clicking View...`);

      try {
        await firstView.click();
        await delay(2000);

        // Click "Approve" radio
        await page.click('input#approve');
        await delay(300);

        // Fill note "good"
        await page.fill('textarea[name="message"]', 'good');
        await delay(300);

        // Click Update TWICE
        const updateBtn = page.locator('button:has-text("Update")').first();
        await updateBtn.click();
        await delay(2000);

        const updateBtn2 = page.locator('button:has-text("Update")').first();
        if (await updateBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
          await updateBtn2.click();
          await delay(2000);
        }

        // Handle any confirmation dialog
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("OK")').first();
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
          await delay(2000);
        }

        // Close modal if still open
        const closeBtn = page.locator('button.btn-close').first();
        if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeBtn.click();
          await delay(1000);
        }

        totalApproved++;
        consecutiveFailures = 0;
        logger.info(`  -> APPROVED (#${totalApproved})`);

      } catch (err: any) {
        totalFailed++;
        consecutiveFailures++;
        logger.error(`  -> FAILED: ${err?.message ?? err}`);

        // Close modal
        const closeBtn = page.locator('button.btn-close, button:has-text("Close")').first();
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click();
          await delay(1000);
        }

        if (consecutiveFailures >= 5) {
          logger.error('5 consecutive failures — stopping.');
          break;
        }
      }
    }

  } catch (error: any) {
    logger.error(`Crashed: ${error?.stack ?? error}`);
  } finally {
    logger.info('='.repeat(60));
    logger.info(`DONE: ${totalApproved} approved, ${totalFailed} failed`);
    logger.info('='.repeat(60));
    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal:', err);
  process.exit(1);
});
