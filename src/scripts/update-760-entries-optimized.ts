/**
 * OPTIMIZED: Update 760 entries with MINIMAL page reloads
 *
 * Strategy:
 * 1. Get all entry links on current page
 * 2. Iterate through them in memory (don't refetch)
 * 3. After all entries on page are done, navigate to next page
 * 4. Repeat until all 76 pages complete
 *
 * This avoids browser crashes from excessive page reloads
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { env } from '../utils/env';
import { Page, Locator } from 'playwright';

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

    // Try multiple selectors for next button
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
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`PAGE ${pageNum} of ${TARGET_PAGES} | Entries #${startEntry}-${startEntry + 9}`);
    logger.info(`${'='.repeat(60)}`);

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

      // Prevent memory buildup
      if (i % 3 === 0) {
        await delay(500);
      }
    }

    logger.info(`\nPage ${pageNum} done: ${successful}/${processed} successful`);
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

  let globalSerial = 1;
  let totalProcessed = 0;
  let totalSuccessful = 0;

  try {
    logger.info('='.repeat(60));
    logger.info('OPTIMIZED: Update 760 Entries (Minimal Reloads)');
    logger.info('='.repeat(60));

    const loginResult = await login(page);
    if (!loginResult.success) throw new Error(`Login failed: ${loginResult.reason}`);
    logger.info('✓ Login successful');
    await delay(1500);

    await page.goto(DRAFT_LIST_BASE_URL, { waitUntil: 'networkidle' });
    await delay(1500);

    for (let pageNum = 1; pageNum <= TARGET_PAGES; pageNum++) {
      if (globalSerial > TARGET_ENTRIES) {
        logger.info(`\n✓✓✓ ALL ${TARGET_ENTRIES} ENTRIES COMPLETED`);
        break;
      }

      const result = await processPage(page, pageNum, globalSerial);
      totalProcessed += result.processed;
      totalSuccessful += result.successful;
      globalSerial = result.nextGlobal;

      if (globalSerial > TARGET_ENTRIES) break;

      // Navigate to next page only if we have more entries
      if (pageNum < TARGET_PAGES) {
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
    console.log('\n' + '='.repeat(60));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Processed: ${totalProcessed}`);
    console.log(`Successful: ${totalSuccessful}`);
    console.log(`Failed: ${totalProcessed - totalSuccessful}`);
    console.log(`Success Rate: ${totalProcessed > 0 ? ((totalSuccessful / totalProcessed) * 100).toFixed(1) : 0}%`);
    console.log('='.repeat(60) + '\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
