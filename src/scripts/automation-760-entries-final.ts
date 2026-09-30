/**
 * FINAL AUTOMATION - Process all 760 entries
 *
 * Pagination: button[aria-label="Next Page"]
 * Formula: month = ((globalSerial - 1) % 6) + 1
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { Page } from 'playwright';

const DRAFT_LIST_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1789898604371';
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

async function updateEntry(page: Page, globalSerial: number): Promise<boolean> {
  try {
    const targetMonth = getMonthForEntryNum(globalSerial);
    logger.info(`[#${globalSerial}] Month: ${targetMonth}`);

    await delay(150);

    const dateField = page.locator('[name="Date of Assignment"]').first();

    try {
      await dateField.waitFor({ state: 'visible', timeout: 1500 });
    } catch (e) {
      logger.error(`[#${globalSerial}] No date field`);
      return false;
    }

    const currentValue = await dateField.inputValue();
    if (!currentValue) {
      logger.warn(`[#${globalSerial}] Empty`);
      return false;
    }

    const newValue = updateDateMonth(currentValue, targetMonth);
    if (newValue === currentValue) {
      logger.warn(`[#${globalSerial}] No change`);
      return false;
    }

    await dateField.fill(newValue);
    await delay(150);
    logger.info(`[#${globalSerial}] ${currentValue} → ${newValue}`);

    await delay(250);
    const saveBtn = await page.locator(
      'button:has-text("Save as Draft"), button:has-text("Save"), button[type="submit"]'
    ).first();

    if (!saveBtn || !(await saveBtn.isVisible())) {
      logger.error(`[#${globalSerial}] No save button`);
      return false;
    }

    await saveBtn.click();
    await delay(1200);

    logger.info(`[#${globalSerial}] ✓`);
    return true;

  } catch (error) {
    logger.error(`[#${globalSerial}] Error:`, error);
    return false;
  }
}

async function openEntryClick(page: Page, link: any): Promise<boolean> {
  try {
    await delay(300);
    await link.click();
    await delay(2000);
    return true;
  } catch (error) {
    logger.error('Click error:', error);
    return false;
  }
}

async function clickNextPage(page: Page): Promise<boolean> {
  try {
    logger.info('→ Next page');
    await delay(600);

    const nextBtn = page.locator('button[aria-label="Next Page"]').first();

    if (!(await nextBtn.isEnabled())) {
      logger.warn('Next button disabled');
      return false;
    }

    await nextBtn.click();
    await delay(2000);

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
    logger.info(`\n${'='.repeat(50)}\nPAGE ${pageNum} | Entry #${startGlobal}-${startGlobal + 9}\n${'='.repeat(50)}`);

    await delay(600);

    const entryLinks = await page.locator(
      'a[href*="/trainee/logbook-entry/"], button:has-text("Edit")'
    ).all();

    logger.info(`Found ${entryLinks.length} entries`);

    for (let i = 0; i < entryLinks.length; i++) {
      if (currentGlobal > TARGET_ENTRIES) break;

      logger.info(`\n--- Entry #${currentGlobal} ---`);

      const opened = await openEntryClick(page, entryLinks[i]);
      if (!opened) {
        logger.error(`Could not open entry #${currentGlobal}`);
        processed++;
        currentGlobal++;
        continue;
      }

      const success = await updateEntry(page, currentGlobal);
      processed++;
      if (success) successful++;

      // Go back to list
      await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
      await delay(1000);

      currentGlobal++;
    }

    logger.info(`\nPage ${pageNum}: ${successful}/${processed} ✓`);
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
  let currentPage = 1;

  try {
    logger.info('='.repeat(70));
    logger.info('FINAL AUTOMATION - Entries #1-760');
    logger.info('='.repeat(70));

    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');
    logger.info('✓ Login OK\n');
    await delay(1000);

    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(1500);

    while (globalSerial <= TARGET_ENTRIES && currentPage <= TARGET_PAGES) {
      const result = await processPage(page, currentPage, globalSerial);
      totalProcessed += result.processed;
      totalSuccessful += result.successful;
      globalSerial = result.nextGlobal;

      if (globalSerial > TARGET_ENTRIES) {
        logger.info(`\n✓✓✓ ALL ${TARGET_ENTRIES} ENTRIES DONE ✓✓✓`);
        break;
      }

      // Next page
      if (currentPage < TARGET_PAGES) {
        const navOK = await clickNextPage(page);
        if (!navOK) {
          logger.error('Could not navigate, stopping');
          break;
        }
        currentPage++;
      }

      await delay(1200);
    }

  } catch (error) {
    logger.error('Fatal:', error);
  } finally {
    console.log('\n' + '='.repeat(70));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total: ${totalProcessed} | Success: ${totalSuccessful} | Failed: ${totalProcessed - totalSuccessful}`);
    if (totalProcessed > 0) {
      console.log(`Rate: ${((totalSuccessful / totalProcessed) * 100).toFixed(1)}%`);
    }
    const lastEntry = Math.min(globalSerial - 1, TARGET_ENTRIES);
    console.log(`Entries: #1 to #${lastEntry}`);
    console.log(`Remaining: ${Math.max(0, TARGET_ENTRIES - lastEntry)}`);
    console.log('='.repeat(70) + '\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
