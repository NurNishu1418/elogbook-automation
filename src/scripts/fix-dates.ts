/**
 * Edit all logbook entries and set "Date of Assignment" to a random date
 * between 17/Nov/2025 and 16/May/2026.
 *
 * Goes through Edit modal for each entry, changes the date, saves.
 * Paginates after each page (10 per page).
 *
 * Usage:
 *   npx ts-node src/scripts/fix-dates.ts
 */
import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
dotenv.config();

const LIST_URL = process.env.LOGBOOK_LIST_URL
  || 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1791367765318';

const DATE_START = new Date('2025-11-17');
const DATE_END = new Date('2026-05-16');

function randomDate(): string {
  const diff = DATE_END.getTime() - DATE_START.getTime();
  const rand = new Date(DATE_START.getTime() + Math.random() * diff);
  const y = rand.getFullYear();
  const m = String(rand.getMonth() + 1).padStart(2, '0');
  const d = String(rand.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let totalEdited = 0;
  let totalFailed = 0;
  let consecutiveFailures = 0;

  const username = process.env.BCPS_USERNAME!;
  const password = process.env.BCPS_PASSWORD!;
  const userType = process.env.BCPS_USER_TYPE || 'Trainee';

  try {
    logger.info('='.repeat(60));
    logger.info('FIX DATES: Set random Date of Assignment (17/Nov/2025 - 16/May/2026)');
    logger.info('='.repeat(60));

    // Direct login
    await page.goto('https://eportal.bcps.edu.bd/login', { waitUntil: 'domcontentloaded' });
    await delay(1000);
    const sel = await page.$('select[name="login_type"]');
    if (sel) await page.selectOption('select[name="login_type"]', { label: userType });
    await delay(500);
    logger.info(`Logging in as ${username} (${userType})...`);
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);
    await delay(2000);
    logger.info(`After login URL: ${page.url()}`);
    if (page.url().includes('/login')) {
      const alerts = await page.locator('.alert, .text-danger, [role="alert"]').allTextContents().catch(() => [] as string[]);
      throw new Error(`Login failed: ${alerts.join(' | ') || 'unknown reason'}`);
    }
    logger.info(`Login OK as ${username}`);

    await page.goto(LIST_URL, { waitUntil: 'domcontentloaded' });
    await delay(3000);

    // Skip to page 2 (1st page already done)
    logger.info('Skipping page 1 (already done). Going to page 2...');
    for (const sel of [
      'button[aria-label="Go to next page"]',
      'li.next > a', 'li.next > button',
      'a[rel="next"]', 'button:has-text("›")', 'button:has-text("»")',
      '.pagination li:last-child a', '.pagination li:last-child button',
    ]) {
      const btn = page.locator(sel).first();
      const vis = await btn.isVisible().catch(() => false);
      if (vis) {
        const disabled = await btn.isDisabled().catch(() => false);
        if (!disabled) {
          await btn.click();
          await delay(3000);
          break;
        }
      }
    }

    let pageNum = 2;

    while (true) {
      logger.info(`--- Page ${pageNum} ---`);

      const editBtns = await page.locator('button:has-text("Edit")').all();
      if (editBtns.length === 0) {
        logger.info('No Edit buttons on this page. Checking next page...');
        const nextPageBtn = page.locator('button[aria-label="Go to next page"]').first();
        if (await nextPageBtn.isVisible().catch(() => false) && !(await nextPageBtn.isDisabled().catch(() => true))) {
          await nextPageBtn.click();
          await delay(2500);
          pageNum++;
          continue;
        }
        logger.info('No more pages. Done!');
        break;
      }

      // Process each Edit button on this page
      for (let i = 0; i < editBtns.length; i++) {
        // Re-query Edit buttons each time (DOM may change after save)
        const currentBtns = await page.locator('button:has-text("Edit")').all();
        if (i >= currentBtns.length) break;

        const newDate = randomDate();
        logger.info(`[${totalEdited + totalFailed + 1}] Clicking Edit (item ${i + 1} on page ${pageNum}), setting date to ${newDate}...`);

        await currentBtns[i].click();
        await delay(2500);

        // Find the Date of Assignment input in the modal
        try {
          await page.evaluate(({ val }: { val: string }) => {
            const input = document.querySelector('input[name="Date of Assignment"]') as HTMLInputElement;
            if (!input) throw new Error('Date of Assignment input not found');
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype, 'value'
            )!.set!;
            setter.call(input, val);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }, { val: newDate });
          await delay(500);

          // Click "Save as Draft" button in modal
          const saveBtn = page.locator('button:has-text("Save as Draft")').first();
          const saveVisible = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);

          if (!saveVisible) {
            throw new Error('"Save as Draft" button not found');
          }

          await saveBtn.click();
          await delay(3000);

          // Handle confirmation dialog if any
          const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("OK")').first();
          if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmBtn.click();
            await delay(2000);
          }

          totalEdited++;
          consecutiveFailures = 0;
          logger.info(`  -> DONE (date set to ${newDate}, #${totalEdited})`);

        } catch (err: any) {
          totalFailed++;
          consecutiveFailures++;
          logger.error(`  -> FAILED: ${err?.message ?? err}`);

          // Try to close the modal
          const closeBtn = page.locator('button:has-text("Close"), button[aria-label="Close"]').first();
          if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click();
            await delay(1000);
          }

          if (consecutiveFailures >= 3) {
            logger.error('3 consecutive failures - stopping.');
            break;
          }
        }

        // Close modal if still open
        const modalClose = page.locator('button:has-text("Close")').first();
        if (await modalClose.isVisible().catch(() => false)) {
          await modalClose.click();
          await delay(1000);
        }
      }

      if (consecutiveFailures >= 3) break;

      // Go to next page - try multiple selectors for the next button
      await delay(1000);
      let wentNext = false;
      // Try aria-label first
      for (const sel of [
        'button[aria-label="Go to next page"]',
        'li.next > a', 'li.next > button',
        'a[rel="next"]', 'button:has-text("›")', 'button:has-text("»")',
        '.pagination li:last-child a', '.pagination li:last-child button',
      ]) {
        const btn = page.locator(sel).first();
        const vis = await btn.isVisible().catch(() => false);
        if (vis) {
          const disabled = await btn.isDisabled().catch(() => false);
          if (!disabled) {
            logger.info(`Next page button found (${sel}), clicking...`);
            await btn.click();
            await delay(3000);
            wentNext = true;
            pageNum++;
            break;
          }
        }
      }
      if (!wentNext) {
        logger.info('No more pages. Done!');
        break;
      }
    }

  } catch (error: any) {
    logger.error(`Crashed: ${error?.stack ?? error}`);
  } finally {
    logger.info('='.repeat(60));
    logger.info(`DONE: ${totalEdited} edited, ${totalFailed} failed`);
    logger.info('='.repeat(60));
    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
