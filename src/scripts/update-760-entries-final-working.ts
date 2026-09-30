/**
 * FINAL WORKING VERSION
 * Pagination: Click > arrow button (not URL-based)
 * Process entries #11-#760 starting from Page 2
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { env } from '../utils/env';
import { Page, Locator } from 'playwright';

const DRAFT_LIST_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1789898604371';
const ENTRIES_PER_PAGE = 10;
const TARGET_ENTRIES = 760;
const START_GLOBAL = 11;  // Start from Entry #11 (Page 2)
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
    logger.info(`[Entry #${globalSerial}] Month: ${targetMonth}`);

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
      logger.warn(`[Entry #${globalSerial}] Empty`);
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
    logger.info(`Back...`);
    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(1200);

    return success;

  } catch (error) {
    logger.error(`Error #${globalSerial}:`, error);
    try {
      await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
      await delay(1000);
    } catch (e) {}
    return false;
  }
}

async function clickNextPageButton(page: Page): Promise<boolean> {
  try {
    logger.info(`\nClicking next page...`);
    await delay(800);

    // The > button for next page
    // Try multiple approaches to find it
    let nextBtn = null;

    // Approach 1: Find by aria-label
    let btns = await page.locator('button[aria-label*="next"]').all();
    if (btns.length > 0) {
      nextBtn = btns[0];
      logger.info('Found via aria-label');
    }

    // Approach 2: Find by text content ">"
    if (!nextBtn) {
      btns = await page.locator('button:has-text("›"), button:has-text(">>"), button:has(svg)').all();
      if (btns.length > 0) {
        // The last clickable button before >| should be the > (next) button
        nextBtn = btns[btns.length - 2] || btns[btns.length - 1];
        logger.info('Found via arrow icon');
      }
    }

    // Approach 3: Find pagination button group and click second-to-last
    if (!nextBtn) {
      const allButtons = await page.locator('button').all();
      if (allButtons.length >= 2) {
        // Pagination buttons are usually at the end: |< < > >|
        // So the > button should be second-to-last
        nextBtn = allButtons[allButtons.length - 2];
        logger.info('Found as second-to-last button');
      }
    }

    if (!nextBtn) {
      logger.error('Next button not found');
      return false;
    }

    // Check if button is enabled
    const isDisabled = await nextBtn.isDisabled();
    if (isDisabled) {
      logger.warn('Next button is disabled (might be last page)');
      return false;
    }

    await nextBtn.click();
    await delay(2500);

    logger.info('✓ Page advanced');
    return true;

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
    logger.info(`PAGE ${pageNum} | Entries #${startEntry}-${startEntry + 9}`);
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
        logger.info(`✓ Target reached`);
        break;
      }

      const success = await processEntryLink(page, entryLinks[i], currentGlobal);
      processed++;
      if (success) successful++;

      currentGlobal++;

      if (i % 3 === 0) await delay(300);
    }

    logger.info(`Page ${pageNum}: ${successful}/${processed} successful`);
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
  let currentPage = 2;  // Start from Page 2

  try {
    logger.info('='.repeat(60));
    logger.info(`UPDATE ENTRIES #11-#760`);
    logger.info(`Page 1 (#1-10) already done`);
    logger.info('='.repeat(60));

    const loginResult = await login(page);
    if (!loginResult.success) throw new Error(`Login failed`);
    logger.info('✓ Login OK');
    await delay(1500);

    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(2000);

    // Navigate to Page 2
    logger.info('\nNavigating to Page 2...');
    const navToPage2 = await clickNextPageButton(page);
    if (!navToPage2) {
      throw new Error('Could not reach Page 2');
    }
    await delay(1500);

    // Process all pages from Page 2 onwards
    while (globalSerial <= TARGET_ENTRIES) {
      const result = await processPage(page, currentPage, globalSerial);
      totalProcessed += result.processed;
      totalSuccessful += result.successful;
      globalSerial = result.nextGlobal;

      if (globalSerial > TARGET_ENTRIES) {
        logger.info(`\n✓✓✓ ALL ENTRIES COMPLETED`);
        break;
      }

      // Navigate to next page
      if (currentPage < TARGET_PAGES) {
        const navSuccess = await clickNextPageButton(page);
        if (!navSuccess) {
          logger.error('Could not navigate further, stopping');
          break;
        }
        currentPage++;
      } else {
        break;
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
    if (totalProcessed > 0) {
      console.log(`Success Rate: ${((totalSuccessful / totalProcessed) * 100).toFixed(1)}%`);
    }
    const lastEntry = Math.min(START_GLOBAL + totalProcessed - 1, TARGET_ENTRIES);
    console.log(`Completed Entries: #11 to #${lastEntry}`);
    console.log(`Remaining: ${Math.max(0, TARGET_ENTRIES - lastEntry)}`);
    console.log('='.repeat(60) + '\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
