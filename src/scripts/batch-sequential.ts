/**
 * BATCH: Process Draft Entries Sequentially
 * SIMPLE APPROACH: Take first entry, update, submit, repeat
 * No pre-filtering, just straightforward sequential processing
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { Page } from 'playwright';

const DRAFT_LIST_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1789898604371';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMonthForEntryNum(globalSerial: number): string {
  const month = ((globalSerial - 1) % 6) + 1;
  return String(month).padStart(2, '0');
}

function updateDateMonth(dateStr: string, newMonth: string): string {
  if (!dateStr) return dateStr;
  const match1 = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match1) {
    const [, year, , day] = match1;
    return `${year}-${newMonth}-${day}`;
  }
  return dateStr;
}

async function updateEntry(page: Page, entryNum: number): Promise<boolean> {
  try {
    const targetMonth = getMonthForEntryNum(entryNum);
    const dateField = page.locator('[name="Date of Assignment"]').first();

    try {
      await dateField.waitFor({ state: 'visible', timeout: 1200 });
    } catch (e) {
      return false;
    }

    const currentValue = await dateField.inputValue();
    if (!currentValue) return false;

    const newValue = updateDateMonth(currentValue, targetMonth);
    if (newValue === currentValue) return false;

    await dateField.fill(newValue);
    await delay(100);

    // Find and click save/submit button
    const saveBtn = await page.locator(
      'button:has-text("Save as Draft"), button:has-text("Save"), button[type="submit"]'
    ).first();

    if (!saveBtn || !(await saveBtn.isVisible())) return false;

    await saveBtn.click();
    await delay(1500);

    logger.info(`[Entry] ✓ (${currentValue} → ${newValue})`);
    return true;

  } catch (error) {
    return false;
  }
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let totalSuccessful = 0;
  let totalProcessed = 0;
  let entryNum = 1;

  try {
    logger.info('='.repeat(60));
    logger.info('BATCH: Sequential Draft Processing');
    logger.info('='.repeat(60) + '\n');

    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');
    logger.info('✓ Login OK\n');
    await delay(1000);

    // Main loop - process entries one by one
    while (true) {
      // Go to draft list
      logger.info(`Going to draft list (Entry #${entryNum})...`);
      await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
      await delay(1500);

      // Get first entry link
      const entryLink = await page.locator(
        'a[href*="/trainee/logbook-entry/"], button:has-text("Edit")'
      ).first();

      if (!entryLink) {
        logger.info('✓ No more entries found - Done!');
        break;
      }

      try {
        logger.info(`Clicking entry...`);
        await entryLink.click();
        await delay(2000);

        // Update the entry
        const success = await updateEntry(page, entryNum);
        totalProcessed++;
        if (success) {
          totalSuccessful++;
        } else {
          logger.warn('Failed to update');
        }

        entryNum++;

      } catch (error) {
        logger.error('Error processing entry:', error);
        totalProcessed++;
        entryNum++;
      }

      // Small delay between entries
      await delay(500);
    }

  } catch (error) {
    logger.error('Fatal:', error);
  } finally {
    console.log('\n' + '='.repeat(60));
    console.log('BATCH RESULT: Sequential Processing');
    console.log('='.repeat(60));
    console.log(`Processed: ${totalProcessed}`);
    console.log(`Successful: ${totalSuccessful}`);
    console.log(`Failed: ${totalProcessed - totalSuccessful}`);
    if (totalProcessed > 0) {
      console.log(`Success Rate: ${((totalSuccessful / totalProcessed) * 100).toFixed(1)}%`);
    }
    console.log(`Total Entries Updated: ${totalSuccessful}`);
    console.log('='.repeat(60) + '\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
