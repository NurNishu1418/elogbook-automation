/**
 * Submit all Draft logbook entries via the inline Edit modal.
 * Filters by Draft ONCE, then clicks Edit → Submit on each entry's modal.
 * No page reloads. Paginates when current page is exhausted.
 *
 * Usage:
 *   npx ts-node src/scripts/submit-drafts.ts
 */
import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { Page } from 'playwright';

const DRAFT_LIST_URL = process.env.DRAFT_LIST_URL
  || 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1791180403672';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let totalSubmitted = 0;
  let totalFailed = 0;
  let consecutiveFailures = 0;

  try {
    logger.info('='.repeat(60));
    logger.info('SUBMIT ALL DRAFT ENTRIES (inline modal approach)');
    logger.info('='.repeat(60));

    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');
    logger.info('Login OK');

    await page.goto(DRAFT_LIST_URL, { waitUntil: 'domcontentloaded' });
    await delay(2500);

    // Filter by Draft ONCE
    const statusSelect = page.locator('select[name="approved_status"]').first();
    if (await statusSelect.isVisible().catch(() => false)) {
      await statusSelect.selectOption({ label: 'Draft' });
    }
    const searchBtn = page.locator('button:has-text("Search")').first();
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click();
      await delay(3000);
    }
    logger.info('Draft filter applied ONCE. No more searching.');

    // Process all entries: Edit modal → Submit → repeat
    while (true) {
      // Check if there are Edit buttons on the current page
      const editBtns = await page.locator('button:has-text("Edit")').all();
      if (editBtns.length === 0) {
        logger.info('No Edit buttons on this page. Checking next page...');
        // Try pagination next
        const nextPageBtn = page.locator('button[aria-label="Go to next page"]').first();
        if (await nextPageBtn.isVisible().catch(() => false) && !(await nextPageBtn.isDisabled().catch(() => true))) {
          await nextPageBtn.click();
          await delay(2000);
          continue;
        }
        logger.info('No more pages. Done!');
        break;
      }

      // Click the FIRST Edit button (always first — after submit, the row
      // changes status and the list may refresh, so we always target the first)
      const editBtn = page.locator('button:has-text("Edit")').first();
      logger.info(`[${totalSubmitted + totalFailed + 1}] Clicking Edit...`);
      await editBtn.click();
      await delay(2000);

      // Wait for the modal's Submit button
      const submitBtn = page.locator('button:has-text("Submit")').first();
      const submitVisible = await submitBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (!submitVisible) {
        logger.error('  -> FAILED: Submit button not visible in modal');
        totalFailed++;
        consecutiveFailures++;
        await page.screenshot({ path: `screenshots/submit-fail-${totalSubmitted + totalFailed}.png`, fullPage: true }).catch(() => {});

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
        continue;
      }

      // Click Submit
      await submitBtn.click();
      await delay(2000);

      // Handle confirmation dialog if any
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("OK")').first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await delay(2000);
      }

      // Wait for modal to close (the entry list should still be visible)
      await delay(1000);

      totalSubmitted++;
      consecutiveFailures = 0;
      logger.info(`  -> SUBMITTED (#${totalSubmitted})`);

      // After submit, the list should auto-refresh or the entry disappears.
      // If the modal is still open, close it.
      const modalStillOpen = await page.locator('button:has-text("Close")').isVisible().catch(() => false);
      if (modalStillOpen) {
        await page.locator('button:has-text("Close")').first().click();
        await delay(1000);
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
  logger.error('Fatal error:', err);
  process.exit(1);
});
