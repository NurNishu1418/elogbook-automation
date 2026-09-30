/**
 * Update 760 draft entries with proper pagination across all 76 pages
 *
 * CRITICAL: Maintains GLOBAL serial counter across all pages
 * Month = ((globalSerial - 1) % 6) + 1
 *
 * Page navigation:
 * Page 1 = entries #1-10
 * Page 2 = entries #11-20
 * ...
 * Page 76 = entries #751-760
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { env } from '../utils/env';
import { Page } from 'playwright';

const DRAFT_LIST_BASE_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1789898604371';
const ENTRIES_PER_PAGE = 10;
const TARGET_ENTRIES = 760;
const TARGET_PAGES = Math.ceil(TARGET_ENTRIES / ENTRIES_PER_PAGE);

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMonthForEntryNum(globalSerial: number): string {
  const month = ((globalSerial - 1) % 6) + 1;
  return String(month).padStart(2, '0');
}

function updateDateMonth(dateStr: string, newMonth: string): string {
  if (!dateStr) return dateStr;

  // Try YYYY-MM-DD format
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

async function updateEntryDateOfAssignment(page: Page, globalSerial: number): Promise<boolean> {
  try {
    const targetMonth = getMonthForEntryNum(globalSerial);
    logger.info(`[Entry #${globalSerial}] Target month: ${targetMonth}`);

    await delay(300);

    // Find the "Date of Assignment" field by name
    const dateField = page.locator('[name="Date of Assignment"]').first();

    try {
      await dateField.waitFor({ state: 'visible', timeout: 3000 });
    } catch (e) {
      logger.error(`[Entry #${globalSerial}] Date of Assignment field not found`);
      return false;
    }

    const currentValue = await dateField.inputValue();
    if (!currentValue) {
      logger.warn(`[Entry #${globalSerial}] Date field is empty`);
      return false;
    }

    logger.info(`[Entry #${globalSerial}] Current date: ${currentValue}`);

    const newValue = updateDateMonth(currentValue, targetMonth);
    if (newValue === currentValue) {
      logger.warn(`[Entry #${globalSerial}] No change needed`);
      return false;
    }

    // Update the field
    await dateField.fill(newValue);
    await delay(300);
    logger.info(`[Entry #${globalSerial}] Updated: ${currentValue} → ${newValue}`);

    // Find and click the Save button
    await delay(400);
    const saveBtn = await page.locator(
      'button:has-text("Save as Draft"), button:has-text("Save"), button[type="submit"]'
    ).first();

    if (!saveBtn || !(await saveBtn.isVisible())) {
      logger.error(`[Entry #${globalSerial}] Save button not found`);
      return false;
    }

    await saveBtn.click();
    await delay(2000);

    logger.info(`[Entry #${globalSerial}] ✓ Saved as Draft`);
    return true;

  } catch (error) {
    logger.error(`[Entry #${globalSerial}] Unexpected error:`, error);
    return false;
  }
}

async function navigateToNextPage(page: Page, currentPageNum: number): Promise<boolean> {
  try {
    logger.info(`\n>>> Navigating from Page ${currentPageNum} to Page ${currentPageNum + 1}...`);

    // Go back to listing first
    await page.goto(DRAFT_LIST_BASE_URL, { waitUntil: 'networkidle' });
    await delay(1500);

    // Find the pagination next button
    // Look for: right arrow button, "next" text, or pagination control
    const nextButtons = await page.locator(
      'button[aria-label*="next"], button[title*="next"], ' +
      'a[aria-label*="next"], a[title*="next"], ' +
      '[aria-label*="Next"], [title*="Next"], ' +
      'button:has-text("›"), button:has-text(">"), ' +
      'a:has-text("›"), a:has-text(">")'
    ).all();

    logger.info(`Found ${nextButtons.length} potential next buttons`);

    if (nextButtons.length === 0) {
      logger.error('No next page button found');
      return false;
    }

    // Click the last one (usually the rightmost arrow is the next button)
    const nextBtn = nextButtons[nextButtons.length - 1];

    logger.info('Clicking next page button...');
    await nextBtn.click();
    await delay(3000);

    // Verify page changed by checking for new entries
    const entryLinks = await page.locator(
      'a[href*="/trainee/logbook-entry/"], button:has-text("Edit")'
    ).all();

    logger.info(`Page loaded with ${entryLinks.length} entries`);

    if (entryLinks.length === 0) {
      logger.warn('Could not verify page change - no entries found');
      return false;
    }

    logger.info(`✓ Successfully navigated to Page ${currentPageNum + 1}`);
    return true;

  } catch (error) {
    logger.error(`Error navigating to next page:`, error);
    return false;
  }
}

async function processCurrentPage(page: Page, pageNum: number, globalSerial: number): Promise<{ processed: number; successful: number; nextGlobalSerial: number }> {
  let processed = 0;
  let successful = 0;
  let currentGlobal = globalSerial;

  try {
    const startEntry = (pageNum - 1) * ENTRIES_PER_PAGE + 1;
    const endEntry = Math.min(startEntry + ENTRIES_PER_PAGE - 1, TARGET_ENTRIES);

    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`PAGE ${pageNum} of ${TARGET_PAGES} | Entries #${startEntry}-${endEntry}`);
    logger.info(`${'='.repeat(60)}`);

    await delay(1000);

    // Get all entry links on current page
    const entryLinks = await page.locator(
      'a[href*="/trainee/logbook-entry/"], button:has-text("Edit")'
    ).all();

    logger.info(`Found ${entryLinks.length} entries on page ${pageNum}`);

    // Process each entry on this page
    for (let i = 0; i < entryLinks.length; i++) {
      if (currentGlobal > TARGET_ENTRIES) {
        logger.info(`✓ Reached target of ${TARGET_ENTRIES} entries`);
        break;
      }

      try {
        logger.info(`\n--- Processing Entry #${currentGlobal} (position ${i + 1} on page ${pageNum}) ---`);

        // Click to open entry
        await delay(600);
        await entryLinks[i].click();
        await delay(3000);

        // Update the entry with GLOBAL serial number
        const success = await updateEntryDateOfAssignment(page, currentGlobal);
        processed++;
        if (success) {
          successful++;
        }

        // Go back to listing page
        logger.info(`Returning to page ${pageNum}...`);
        await page.goto(DRAFT_LIST_BASE_URL, { waitUntil: 'networkidle' });
        await delay(1500);

        // Re-fetch links for next entry on this page
        const freshLinks = await page.locator(
          'a[href*="/trainee/logbook-entry/"], button:has-text("Edit")'
        ).all();

        if (i + 1 < freshLinks.length) {
          entryLinks[i + 1] = freshLinks[i + 1];
        }

        currentGlobal++;

        // Progress logging
        if ((i + 1) % 5 === 0) {
          logger.info(`Page ${pageNum} progress: ${processed}/${Math.min(ENTRIES_PER_PAGE, entryLinks.length)} entries, ${successful} successful`);
        }

      } catch (error) {
        logger.error(`Error on entry #${currentGlobal}:`, error);
        processed++;
        currentGlobal++;

        // Try to recover to listing page
        try {
          await page.goto(DRAFT_LIST_BASE_URL, { waitUntil: 'networkidle' });
          await delay(1500);
        } catch (e) {
          logger.warn('Could not return to listing');
        }
      }
    }

    logger.info(`\nPage ${pageNum} Summary: Processed=${processed}, Successful=${successful}`);
    return { processed, successful, nextGlobalSerial: currentGlobal };

  } catch (error) {
    logger.error(`Fatal error on page ${pageNum}:`, error);
    return { processed, successful, nextGlobalSerial: currentGlobal };
  }
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let globalSerial = 1;
  let totalProcessed = 0;
  let totalSuccessful = 0;

  try {
    logger.info('\n' + '='.repeat(60));
    logger.info('UPDATE 760 DRAFT ENTRIES - FULL PAGINATION');
    logger.info('='.repeat(60));
    logger.info(`Target: Entries #1-760 across 76 pages`);
    logger.info(`Month pattern: 01,02,03,04,05,06 (continuous)`);

    // Login
    logger.info('\nLogging in...');
    const loginResult = await login(page);
    if (!loginResult.success) {
      throw new Error(`Login failed: ${loginResult.reason}`);
    }
    logger.info('✓ Login successful');
    await delay(2000);

    // Navigate to draft list
    logger.info(`\nNavigating to draft list...`);
    await page.goto(DRAFT_LIST_BASE_URL, { waitUntil: 'networkidle' });
    await delay(2000);

    // Process all pages
    for (let pageNum = 1; pageNum <= TARGET_PAGES; pageNum++) {
      if (globalSerial > TARGET_ENTRIES) {
        logger.info(`\n✓✓✓ All ${TARGET_ENTRIES} entries processed!`);
        break;
      }

      // Process current page
      const result = await processCurrentPage(page, pageNum, globalSerial);
      totalProcessed += result.processed;
      totalSuccessful += result.successful;
      globalSerial = result.nextGlobalSerial;

      // Check if we need to continue
      if (globalSerial > TARGET_ENTRIES) {
        logger.info(`\n✓✓✓ Completed! Processed all ${TARGET_ENTRIES} entries.`);
        break;
      }

      // Navigate to next page if there are more entries to process
      if (pageNum < TARGET_PAGES) {
        const navigateSuccess = await navigateToNextPage(page, pageNum);
        if (!navigateSuccess) {
          logger.error(`Failed to navigate to page ${pageNum + 1}, stopping`);
          break;
        }
      }

      // Small delay between pages
      await delay(2000);
    }

  } catch (error) {
    logger.error('Fatal error:', error);
  } finally {
    console.log('\n' + '='.repeat(60));
    console.log('FINAL SUMMARY - ALL PAGES');
    console.log('='.repeat(60));
    console.log(`Total Entries Processed: ${totalProcessed}`);
    console.log(`Successful Updates: ${totalSuccessful}`);
    console.log(`Failed: ${totalProcessed - totalSuccessful}`);
    console.log(`Success Rate: ${totalProcessed > 0 ? ((totalSuccessful / totalProcessed) * 100).toFixed(1) : 0}%`);
    console.log(`Global Serial Counter: ${globalSerial} (expected: 761)`);
    console.log('='.repeat(60) + '\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
