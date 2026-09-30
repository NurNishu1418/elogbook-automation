/**
 * Update Date of Assignment months for entries #1-760 in a serial 6-month cycle.
 *
 * Month sequence: 01, 02, 03, 04, 05, 06, 01, 02, 03, 04, 05, 06...
 * Formula: month = ((entry_number - 1) % 6) + 1
 *
 * Only changes the MONTH, preserves DAY and YEAR.
 * Keeps all entries as Draft.
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { env } from '../utils/env';
import { Page } from 'playwright';

const DRAFT_LIST_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1789898604371';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate which month Entry N should have
 */
function getMonthForEntry(entryNumber: number): number {
  return ((entryNumber - 1) % 6) + 1;
}

/**
 * Parse date string (DD/MM/YYYY or YYYY-MM-DD) and replace month
 */
function updateDateMonth(dateStr: string, newMonth: number): string {
  if (!dateStr) return dateStr;

  const paddedMonth = String(newMonth).padStart(2, '0');

  // Try DD/MM/YYYY format
  const match1 = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match1) {
    const [, day, , year] = match1;
    return `${day}/${paddedMonth}/${year}`;
  }

  // Try YYYY-MM-DD format
  const match2 = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match2) {
    const [, year, , day] = match2;
    return `${year}-${paddedMonth}-${day}`;
  }

  return dateStr;
}

/**
 * Fix the current entry's Date of Assignment month
 */
async function updateCurrentEntry(page: Page, entryNum: number): Promise<boolean> {
  try {
    const newMonth = getMonthForEntry(entryNum);
    const paddedMonth = String(newMonth).padStart(2, '0');
    logger.info(`[Entry ${entryNum}] Target month: ${paddedMonth}`);

    // Find the "Date of Assignment" field specifically by name
    const dateField = page.locator('[name="Date of Assignment"]').first();

    // Wait for the field to be visible
    try {
      await dateField.waitFor({ state: 'visible', timeout: 5000 });
    } catch (e) {
      logger.error(`[Entry ${entryNum}] Date of Assignment field not found or not visible`);
      return false;
    }

    const currentValue = await dateField.inputValue();
    logger.info(`[Entry ${entryNum}] Current value: "${currentValue}"`);

    if (!currentValue) {
      logger.warn(`[Entry ${entryNum}] Date field is empty, nothing to update`);
      return false;
    }

    const newValue = updateDateMonth(currentValue, newMonth);
    logger.info(`[Entry ${entryNum}] New value: "${newValue}"`);

    if (newValue === currentValue) {
      logger.warn(`[Entry ${entryNum}] No change needed (format mismatch or already correct)`);
      return false;
    }

    // Update the field
    await dateField.clear();
    await delay(200);
    await dateField.fill(newValue);
    await delay(400);

    logger.info(`[Entry ${entryNum}] Date field updated`);

    // Click Save as Draft button
    await delay(600);
    const saveBtn = await page.locator(
      'button:has-text("Save as Draft"), ' +
      'button:has-text("Save"), ' +
      'button[type="submit"]'
    ).first();

    if (!saveBtn || !(await saveBtn.isVisible())) {
      logger.error(`[Entry ${entryNum}] Save button not found or not visible`);
      return false;
    }

    logger.info(`[Entry ${entryNum}] Clicking Save button...`);
    await saveBtn.click();
    await delay(2500);

    logger.info(`[Entry ${entryNum}] ✓ Saved as Draft`);
    return true;

  } catch (error) {
    logger.error(`[Entry ${entryNum}] Error:`, error);
    return false;
  }
}

/**
 * Open an entry by clicking on it in the list
 */
async function openEntry(page: Page, entryIndex: number): Promise<boolean> {
  try {
    // Try to find clickable entry rows/links
    const entryRows = await page.locator(
      'a[href*="/trainee/logbook-entry/"], ' +
      'button:has-text("Edit"), ' +
      'tr[data-entry-id], ' +
      '[role="button"][data-entry-id], ' +
      'td:has-text("Entry"), ' +
      'a[href*="logbook"]'
    ).all();

    if (entryIndex >= entryRows.length) {
      logger.warn(`Entry index ${entryIndex} not found in list (total: ${entryRows.length})`);
      return false;
    }

    logger.info(`Opening entry from list...`);
    await entryRows[entryIndex].click();
    await delay(3000);

    return true;
  } catch (error) {
    logger.error(`Error opening entry:`, error);
    return false;
  }
}

/**
 * Main processing loop
 */
async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let successCount = 0;
  let failedCount = 0;
  let totalProcessed = 0;

  try {
    logger.info('=== UPDATE ENTRY MONTHS (Serial 6-Month Cycle) ===');
    logger.info(`Target: Entries #1-760`);
    logger.info(`Month sequence: 01, 02, 03, 04, 05, 06, 01, 02, 03, 04, 05, 06...`);
    logger.info(`Using .env credentials: ${env.username}`);

    // Login
    logger.info('Logging in...');
    const loginResult = await login(page);
    if (!loginResult.success) {
      throw new Error(`Login failed: ${loginResult.reason}`);
    }
    logger.info('✓ Login successful');
    await delay(2000);

    // Go to draft list
    logger.info(`Going to draft list: ${DRAFT_LIST_URL}`);
    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(2500);

    // TEST: Process Entry #1 first to verify logic
    logger.info('\n========== TEST: ENTRY #1 ==========');
    const testSuccess = await openEntry(page, 0);
    if (testSuccess) {
      const fixedTest = await updateCurrentEntry(page, 1);
      if (fixedTest) {
        logger.info('✓ Test passed! Entry #1 month updated successfully');
        successCount++;
        totalProcessed++;
      } else {
        logger.error('✗ Test failed! Could not update Entry #1');
        failedCount++;
        totalProcessed++;
      }
    } else {
      logger.error('✗ Could not open Entry #1');
      failedCount++;
      totalProcessed++;
    }

    // Go back to draft list
    logger.info('Going back to draft list...');
    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(2500);

    // Ask user to verify before continuing
    logger.info('\n========== VERIFICATION NEEDED ==========');
    logger.info('Entry #1 has been processed.');
    logger.info('Please check the portal to verify:');
    logger.info('  - Date of Assignment month is now 01');
    logger.info('  - Day and Year are unchanged');
    logger.info('  - Status is still Draft');
    logger.info('\nWaiting for manual verification...');
    logger.info('Pausing for 30 seconds. Check the portal and then continue.');

    await delay(30000);

    logger.info('Continuing to process remaining entries #2-760...');
    await delay(2000);

    // Now process entries 2-760
    // We'll need to reload the list multiple times as we go through pages
    let currentEntryNumber = 2;

    while (currentEntryNumber <= 760) {
      try {
        // Reload list
        await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
        await delay(2000);

        // Open next entry
        const openSuccess = await openEntry(page, currentEntryNumber - 2);
        if (!openSuccess) {
          logger.warn(`Could not open entry #${currentEntryNumber}, stopping`);
          break;
        }

        await delay(1500);

        // Update the entry
        const updateSuccess = await updateCurrentEntry(page, currentEntryNumber);
        if (updateSuccess) {
          successCount++;
        } else {
          failedCount++;
        }

        totalProcessed++;

        // Log progress every 10 entries
        if (currentEntryNumber % 10 === 0) {
          logger.info(`Progress: ${totalProcessed}/760 processed, ${successCount} successful, ${failedCount} failed`);
        }

        currentEntryNumber++;

        // Small delay between entries
        await delay(800);

      } catch (error) {
        logger.error(`Error processing entry ${currentEntryNumber}:`, error);
        failedCount++;
        totalProcessed++;
        currentEntryNumber++;

        // Try to recover
        try {
          await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
          await delay(2000);
        } catch (e) {
          logger.warn('Could not navigate back to list, continuing...');
        }
      }
    }

  } catch (error) {
    logger.error('Fatal error:', error);
  } finally {
    console.log('\n==================================================');
    console.log('ENTRY MONTH UPDATE SUMMARY');
    console.log('==================================================');
    console.log(`Total Processed: ${totalProcessed}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log('==================================================\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
