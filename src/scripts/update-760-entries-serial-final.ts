/**
 * Update 760 draft entries sequentially with serial 6-month cycle
 *
 * Strategy:
 * 1. Navigate to draft list (10 entries per page)
 * 2. Loop through ALL pages
 * 3. For each entry found in order, assign month based on position:
 *    Entry #1 → month 01
 *    Entry #2 → month 02
 *    ...
 *    Entry #6 → month 06
 *    Entry #7 → month 01 (cycle repeats)
 *    etc.
 * 4. Update "Date of Assignment" field and save
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { env } from '../utils/env';
import { Page } from 'playwright';

const DRAFT_LIST_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1789898604371';
const ENTRIES_PER_PAGE = 10;
const TARGET_ENTRIES = 760;
const TARGET_PAGES = Math.ceil(TARGET_ENTRIES / ENTRIES_PER_PAGE);

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMonthForEntryNum(entryNum: number): string {
  const month = ((entryNum - 1) % 6) + 1;
  return String(month).padStart(2, '0');
}

function updateDateMonth(dateStr: string, newMonth: string): string {
  if (!dateStr) return dateStr;

  // Try YYYY-MM-DD format (most common in HTML date inputs)
  const match1 = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match1) {
    const [, year, , day] = match1;
    return `${year}-${newMonth}-${day}`;
  }

  // Try DD/MM/YYYY format
  const match2 = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match2) {
    const [, day, , year] = match2;
    return `${day}/${newMonth}/${year}`;
  }

  return dateStr;
}

async function updateEntryDateOfAssignment(page: Page, entryNum: number): Promise<boolean> {
  try {
    const targetMonth = getMonthForEntryNum(entryNum);
    logger.info(`[Entry ${entryNum}] Target month: ${targetMonth}`);

    // Wait a moment for page to settle
    await delay(500);

    // Find the "Date of Assignment" field by name
    const dateField = page.locator('[name="Date of Assignment"]').first();

    try {
      await dateField.waitFor({ state: 'visible', timeout: 3000 });
    } catch (e) {
      logger.error(`[Entry ${entryNum}] Date of Assignment field not found`);
      return false;
    }

    const currentValue = await dateField.inputValue();
    if (!currentValue) {
      logger.warn(`[Entry ${entryNum}] Date field is empty`);
      return false;
    }

    logger.info(`[Entry ${entryNum}] Current date: ${currentValue}`);

    const newValue = updateDateMonth(currentValue, targetMonth);
    if (newValue === currentValue) {
      logger.warn(`[Entry ${entryNum}] No change (format issue or already correct)`);
      return false;
    }

    // Update the field
    await dateField.fill(newValue);
    await delay(300);
    logger.info(`[Entry ${entryNum}] Date updated: ${currentValue} → ${newValue}`);

    // Find and click the Save button
    await delay(400);
    const saveBtn = await page.locator(
      'button:has-text("Save as Draft"), button:has-text("Save"), button[type="submit"]'
    ).first();

    if (!saveBtn) {
      logger.error(`[Entry ${entryNum}] Save button not found`);
      return false;
    }

    if (!(await saveBtn.isVisible())) {
      logger.error(`[Entry ${entryNum}] Save button not visible`);
      return false;
    }

    await saveBtn.click();
    await delay(2000);

    logger.info(`[Entry ${entryNum}] ✓ Saved as Draft`);
    return true;

  } catch (error) {
    logger.error(`[Entry ${entryNum}] Unexpected error:`, error);
    return false;
  }
}

async function processPage(page: Page, pageNum: number): Promise<{ processed: number; successful: number; failed: number; startEntryNum: number }> {
  const startEntryNum = (pageNum - 1) * ENTRIES_PER_PAGE + 1;
  let processed = 0;
  let successful = 0;
  let failed = 0;

  try {
    logger.info(`\n========== PAGE ${pageNum} of ${TARGET_PAGES} (Entries #${startEntryNum}-${startEntryNum + ENTRIES_PER_PAGE - 1}) ==========`);

    await delay(1500);

    // Find all entry links on this page
    const entryLinks = await page.locator(
      'a[href*="/trainee/logbook-entry/"], button:has-text("Edit")'
    ).all();

    logger.info(`Found ${entryLinks.length} entries on page ${pageNum}`);

    // Process each entry
    for (let i = 0; i < entryLinks.length; i++) {
      const entryNum = startEntryNum + i;

      if (entryNum > TARGET_ENTRIES) {
        logger.info(`Reached target of ${TARGET_ENTRIES} entries`);
        break;
      }

      try {
        logger.info(`\n--- Entry #${entryNum} ---`);

        // Click to open entry
        await delay(600);
        await entryLinks[i].click();
        await delay(3000);

        // Update the entry
        const success = await updateEntryDateOfAssignment(page, entryNum);
        processed++;
        if (success) {
          successful++;
        } else {
          failed++;
        }

        // Go back to list
        logger.info(`Going back to list...`);
        await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
        await delay(1500);

        // Re-fetch links for next iteration
        const freshLinks = await page.locator(
          'a[href*="/trainee/logbook-entry/"], button:has-text("Edit")'
        ).all();

        if (i + 1 < freshLinks.length) {
          entryLinks[i + 1] = freshLinks[i + 1];
        }

      } catch (error) {
        logger.error(`Error processing entry #${entryNum}:`, error);
        processed++;
        failed++;

        // Try to recover
        try {
          await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
          await delay(1500);
        } catch (e) {
          logger.warn('Could not navigate back');
        }
      }
    }

    logger.info(`\nPage ${pageNum} Summary: Processed=${processed}, Successful=${successful}, Failed=${failed}`);
    return { processed, successful, failed, startEntryNum };

  } catch (error) {
    logger.error(`Error on page ${pageNum}:`, error);
    return { processed: 0, successful: 0, failed: 0, startEntryNum };
  }
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;

  try {
    logger.info('===============================================');
    logger.info('UPDATE 760 DRAFT ENTRIES - SERIAL 6-MONTH CYCLE');
    logger.info('===============================================');
    logger.info(`Target: Entries #1-760`);
    logger.info(`Month pattern: 01,02,03,04,05,06, repeating`);
    logger.info(`Pages: ~${TARGET_PAGES} pages (10 entries per page)`);

    // Login
    logger.info('\nLogging in...');
    const loginResult = await login(page);
    if (!loginResult.success) {
      throw new Error(`Login failed: ${loginResult.reason}`);
    }
    logger.info('✓ Login successful');
    await delay(2000);

    // Go to draft list
    logger.info(`\nNavigating to draft list...`);
    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(2000);

    // Process all pages
    for (let pageNum = 1; pageNum <= TARGET_PAGES; pageNum++) {
      const result = await processPage(page, pageNum);
      totalProcessed += result.processed;
      totalSuccessful += result.successful;
      totalFailed += result.failed;

      // Check if we've reached the target
      if (totalProcessed >= TARGET_ENTRIES) {
        logger.info(`\n✓ Reached target of ${TARGET_ENTRIES} entries`);
        break;
      }

      // Stop if we hit too many failures
      if (pageNum > 5 && totalFailed / totalProcessed > 0.8) {
        logger.error('✗ Too many failures, stopping');
        break;
      }
    }

  } catch (error) {
    logger.error('Fatal error:', error);
  } finally {
    console.log('\n===============================================');
    console.log('FINAL SUMMARY');
    console.log('===============================================');
    console.log(`Total Processed: ${totalProcessed}`);
    console.log(`Successful: ${totalSuccessful}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Success Rate: ${totalProcessed > 0 ? ((totalSuccessful / totalProcessed) * 100).toFixed(1) : 0}%`);
    console.log('===============================================\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
