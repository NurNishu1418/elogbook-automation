/**
 * BATCH: Process Entries #207-760 (Pages 21-76) - OPTIMIZED
 * Key optimization: Stay on same page while processing entries
 * No full page refresh after each entry - saves 80%+ time!
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { Page } from 'playwright';

const DRAFT_LIST_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1789898604371';
const START_ENTRY = 207;
const END_ENTRY = 760;
const START_PAGE = 21;

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

async function updateEntry(page: Page, globalSerial: number): Promise<boolean> {
  try {
    const targetMonth = getMonthForEntryNum(globalSerial);
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

    const saveBtn = await page.locator(
      'button:has-text("Save as Draft"), button:has-text("Save"), button[type="submit"]'
    ).first();

    if (!saveBtn || !(await saveBtn.isVisible())) return false;

    await saveBtn.click();
    await delay(1000);

    logger.info(`[#${globalSerial}] ✓`);
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
  let currentEntry = START_ENTRY;
  let currentPage = START_PAGE;

  try {
    logger.info('='.repeat(60));
    logger.info(`BATCH: Entries #${START_ENTRY}-${END_ENTRY} [OPTIMIZED]`);
    logger.info('='.repeat(60) + '\n');

    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');
    logger.info('✓ Login OK\n');
    await delay(1000);

    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(1500);

    // Navigate to starting page
    logger.info(`Navigating to Page ${START_PAGE}...`);
    for (let i = 1; i < START_PAGE; i++) {
      const nextBtn = page.locator('button[aria-label="Next Page"]').first();
      await nextBtn.click();
      await delay(1500);
    }
    logger.info('✓ On starting page\n');

    while (currentEntry <= END_ENTRY) {
      const entryLinks = await page.locator(
        'a[href*="/trainee/logbook-entry/"], button:has-text("Edit")'
      ).all();

      logger.info(`PAGE ${currentPage}: Processing ${entryLinks.length} entries`);

      for (let i = 0; i < entryLinks.length && currentEntry <= END_ENTRY; i++) {
        try {
          await delay(200);
          await entryLinks[i].click();
          await delay(1800);

          const success = await updateEntry(page, currentEntry);
          totalProcessed++;
          if (success) totalSuccessful++;

          // OPTIMIZED: Use goBack instead of full page reload
          // This keeps us on the same page state
          await page.goBack({ waitUntil: 'networkidle' });
          await delay(800);

          currentEntry++;

        } catch (error) {
          logger.error(`[#${currentEntry}] Error`);
          totalProcessed++;
          currentEntry++;
        }
      }

      // Move to next page after completing all 10 entries on current page
      if (currentEntry <= END_ENTRY) {
        logger.info(`Moving to Page ${currentPage + 1}`);
        const nextBtn = page.locator('button[aria-label="Next Page"]').first();

        try {
          const canNext = await nextBtn.isEnabled();
          if (canNext) {
            await nextBtn.click();
            await delay(1500);
            currentPage++;
            logger.info('✓ Navigated\n');
          } else {
            logger.info('No more pages');
            break;
          }
        } catch (e) {
          logger.error('Navigation failed');
          break;
        }
      }
    }

  } catch (error) {
    logger.error('Fatal:', error);
  } finally {
    console.log('\n' + '='.repeat(60));
    console.log(`BATCH RESULT: #${START_ENTRY}-${END_ENTRY}`);
    console.log('='.repeat(60));
    console.log(`Processed: ${totalProcessed}`);
    console.log(`Successful: ${totalSuccessful}`);
    console.log(`Failed: ${totalProcessed - totalSuccessful}`);
    if (totalProcessed > 0) {
      console.log(`Success Rate: ${((totalSuccessful / totalProcessed) * 100).toFixed(1)}%`);
    }
    console.log(`Completed: #${START_ENTRY} to #${START_ENTRY + totalProcessed - 1}`);
    console.log('='.repeat(60) + '\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
