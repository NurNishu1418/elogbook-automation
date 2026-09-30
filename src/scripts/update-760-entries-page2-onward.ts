/**
 * Update entries from Page 2 onwards (Entry #11 to #760)
 * Page 1 (entries #1-10) already completed
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { env } from '../utils/env';
import { Page, Locator } from 'playwright';

const DRAFT_LIST_BASE_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1789898604371';
const ENTRIES_PER_PAGE = 10;
const TARGET_ENTRIES = 760;
const START_PAGE = 2;  // Start from Page 2
const START_GLOBAL = 11; // Start from Entry #11
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
  const match1 = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match1) {
    const [, year, , day] = match1;
    return `${year}-${newMonth}-${day}`;
  }
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

    await delay(200);

    const dateField = page.locator('[name="Date of Assignment"]').first();

    try {
      await dateField.waitFor({ state: 'visible', timeout: 2000 });
    } catch (e) {
      logger.error(`[Entry #${globalSerial}] Date field not found`);
      return false;
    }

    const currentValue = await dateField.inputValue();
    if (!currentValue) {
      logger.warn(`[Entry #${globalSerial}] Date field empty`);
      return false;
    }

    const newValue = updateDateMonth(currentValue, targetMonth);
    if (newValue === currentValue) {
      logger.warn(`[Entry #${globalSerial}] No change`);
      return false;
    }

    await dateField.fill(newValue);
    await delay(200);
    logger.info(`[Entry #${globalSerial}] ${currentValue} → ${newValue}`);

    await delay(300);
    const saveBtn = await page.locator(
      'button:has-text("Save as Draft"), button:has-text("Save"), button[type="submit"]'
    ).first();

    if (!saveBtn || !(await saveBtn.isVisible())) {
      logger.error(`[Entry #${globalSerial}] Save button not found`);
      return false;
    }

    await saveBtn.click();
    await delay(1500);

    logger.info(`[Entry #${globalSerial}] ✓ Saved`);
    return true;

  } catch (error) {
    logger.error(`[Entry #${globalSerial}] Error:`, error);
    return false;
  }
}

async function processEntryLink(page: Page, link: Locator, globalSerial: number): Promise<boolean> {
  try {
    logger.info(`\n--- Entry #${globalSerial} ---`);

    await delay(400);
    await link.click();
    await delay(2500);

    const success = await updateEntryDateOfAssignment(page, globalSerial);

    // Go back to list
    logger.info(`Back to list...`);
    await page.goto(DRAFT_LIST_BASE_URL, { waitUntil: 'networkidle' });
    await delay(1200);

    return success;

  } catch (error) {
    logger.error(`Error on entry #${globalSerial}:`, error);
    try {
      await page.goto(DRAFT_LIST_BASE_URL, { waitUntil: 'networkidle' });
      await delay(1000);
    } catch (e) {}
    return false;
  }
}

async function navigateToNextPage(page: Page): Promise<boolean> {
  try {
    logger.info(`\nNavigating to next page...`);

    await delay(1000);

    const nextSelectors = [
      'button[aria-label*="next"], a[aria-label*="next"]',
      'button:has-text("›"), button:has-text(">")',
      'a:has-text("›"), a:has-text(">")',
      '[class*="next"][role="button"]'
    ];

    for (const selector of nextSelectors) {
      const btns = await page.locator(selector).all();
      if (btns.length > 0) {
        const nextBtn = btns[btns.length - 1];
        logger.info('Clicking next page button...');
        await nextBtn.click();
        await delay(2500);
        logger.info('✓ Page navigated');
        return true;
      }
    }

    logger.error('Next button not found');
    return false;

  } catch (error) {
    logger.error('Navigation error:', error);
    return false;
  }
}

async function processPage(page: Page, pageNum: number, startGlobal: number): Promise<{ processed: number; successful: number; nextGlobal: number }> {
  let processed = 0;
  let successful = 0;
  let currentGlobal = startGlobal;

  try {
    const startEntry = (pageNum - 1) * ENTRIES_PER_PAGE + 1;
    logger.info(`\n${'='.repeat(70)}`);
    logger.info(`PAGE ${pageNum} of ${TARGET_PAGES} | Entries #${startEntry}-${Math.min(startEntry + 9, TARGET_ENTRIES)}`);
    logger.info(`${'='.repeat(70)}`);

    await delay(800);

    // Get all entry links on current page
    const entryLinks = await page.locator(
      'a[href*="/trainee/logbook-entry/"], button:has-text("Edit")'
    ).all();

    logger.info(`Found ${entryLinks.length} entries`);

    // Process each entry
    for (let i = 0; i < entryLinks.length; i++) {
      if (currentGlobal > TARGET_ENTRIES) {
        logger.info(`✓ Reached target`);
        break;
      }

      const success = await processEntryLink(page, entryLinks[i], currentGlobal);
      processed++;
      if (success) successful++;

      currentGlobal++;

      if (i % 3 === 0) {
        await delay(500);
      }
    }

    logger.info(`\nPage ${pageNum} Summary: ${successful}/${processed} successful`);
    return { processed, successful, nextGlobal: currentGlobal };

  } catch (error) {
    logger.error(`Page ${pageNum} error:`, error);
    return { processed, successful, nextGlobal: currentGlobal };
  }
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let globalSerial = START_GLOBAL;
  let totalProcessed = 0;
  let totalSuccessful = 0;

  try {
    logger.info('='.repeat(70));
    logger.info(`UPDATE ENTRIES #11-760 (Page 2 onwards)`);
    logger.info(`Page 1 entries (#1-10) already completed`);
    logger.info('='.repeat(70));

    const loginResult = await login(page);
    if (!loginResult.success) throw new Error(`Login failed: ${loginResult.reason}`);
    logger.info('✓ Login successful');
    await delay(1500);

    // Navigate to base list
    await page.goto(DRAFT_LIST_BASE_URL, { waitUntil: 'networkidle' });
    await delay(1500);

    // Navigate to Page 2
    logger.info('\nNavigating to Page 2...');
    for (let i = 1; i < START_PAGE; i++) {
      const navSuccess = await navigateToNextPage(page);
      if (!navSuccess) {
        throw new Error('Could not navigate to Page 2');
      }
      await delay(1000);
    }

    logger.info('✓ Reached Page 2');
    await delay(2000);

    // Process all pages from Page 2 onwards
    for (let pageNum = START_PAGE; pageNum <= TARGET_PAGES; pageNum++) {
      if (globalSerial > TARGET_ENTRIES) {
        logger.info(`\n✓✓✓ ALL ENTRIES (#11-#760) COMPLETED`);
        break;
      }

      const result = await processPage(page, pageNum, globalSerial);
      totalProcessed += result.processed;
      totalSuccessful += result.successful;
      globalSerial = result.nextGlobal;

      if (globalSerial > TARGET_ENTRIES) break;

      // Navigate to next page
      if (pageNum < TARGET_PAGES && globalSerial <= TARGET_ENTRIES) {
        const navSuccess = await navigateToNextPage(page);
        if (!navSuccess) {
          logger.error('Could not navigate to next page, stopping');
          break;
        }
      }

      await delay(1500);
    }

  } catch (error) {
    logger.error('Fatal:', error);
  } finally {
    console.log('\n' + '='.repeat(70));
    console.log('FINAL SUMMARY - ENTRIES #11-#760');
    console.log('='.repeat(70));
    console.log(`Total Processed: ${totalProcessed}`);
    console.log(`Successful: ${totalSuccessful}`);
    console.log(`Failed: ${totalProcessed - totalSuccessful}`);
    console.log(`Success Rate: ${totalProcessed > 0 ? ((totalSuccessful / totalProcessed) * 100).toFixed(1) : 0}%`);
    console.log(`Entries Completed: #11 to #${Math.min(START_GLOBAL + totalProcessed - 1, TARGET_ENTRIES)}`);
    console.log(`Remaining: ${Math.max(0, TARGET_ENTRIES - (START_GLOBAL + totalProcessed - 1))}`);
    console.log('='.repeat(70) + '\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
