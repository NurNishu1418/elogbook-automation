/**
 * AUTOMATION - Process entries #11-760 (Page 2 onwards)
 * Entry #1-10 already completed
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { Page } from 'playwright';

const DRAFT_LIST_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1789898604371';
const ENTRIES_PER_PAGE = 10;
const START_ENTRY = 11;  // Start from entry 11
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

async function openEntry(page: Page, link: any): Promise<boolean> {
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
    await delay(600);
    const nextBtn = page.locator('button[aria-label="Next Page"]').first();

    if (!(await nextBtn.isEnabled())) {
      return false;
    }

    await nextBtn.click();
    await delay(2000);
    return true;

  } catch (error) {
    return false;
  }
}

async function processPage(page: Page, pageNum: number, startGlobal: number): Promise<{ processed: number; successful: number; nextGlobal: number }> {
  let processed = 0;
  let successful = 0;
  let currentGlobal = startGlobal;

  try {
    logger.info(`\nPAGE ${pageNum} | Entry #${startGlobal}-${Math.min(startGlobal + 9, TARGET_ENTRIES)}\n${'='.repeat(40)}`);

    await delay(600);

    const entryLinks = await page.locator(
      'a[href*="/trainee/logbook-entry/"], button:has-text("Edit")'
    ).all();

    logger.info(`Found ${entryLinks.length} entries`);

    for (let i = 0; i < entryLinks.length; i++) {
      if (currentGlobal > TARGET_ENTRIES) break;

      logger.info(`\n[#${currentGlobal}]`);

      const opened = await openEntry(page, entryLinks[i]);
      if (!opened) {
        logger.error(`Could not open`);
        processed++;
        currentGlobal++;
        continue;
      }

      const success = await updateEntry(page, currentGlobal);
      processed++;
      if (success) successful++;

      await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
      await delay(1000);

      currentGlobal++;
    }

    logger.info(`Page ${pageNum}: ${successful}/${processed}`);
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

  let globalSerial = START_ENTRY;
  let totalProcessed = 0;
  let totalSuccessful = 0;
  let currentPage = 2;  // Start from page 2 (entries 11-20)

  try {
    logger.info('='.repeat(60));
    logger.info(`AUTOMATION: Entries #${START_ENTRY}-${TARGET_ENTRIES}`);
    logger.info('='.repeat(60) + '\n');

    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');
    logger.info('✓ Login OK');
    await delay(1000);

    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(1500);

    // Navigate to Page 2
    logger.info('\nNavigating to Page 2...');
    const nav2 = await clickNextPage(page);
    if (!nav2) {
      throw new Error('Could not reach Page 2');
    }
    logger.info('✓ On Page 2\n');
    await delay(1200);

    while (globalSerial <= TARGET_ENTRIES && currentPage <= TARGET_PAGES) {
      const result = await processPage(page, currentPage, globalSerial);
      totalProcessed += result.processed;
      totalSuccessful += result.successful;
      globalSerial = result.nextGlobal;

      if (globalSerial > TARGET_ENTRIES) {
        logger.info(`\n✓✓✓ ENTRIES #${START_ENTRY}-${TARGET_ENTRIES} COMPLETED ✓✓✓`);
        break;
      }

      if (currentPage < TARGET_PAGES) {
        logger.info('→ Next page');
        const navOK = await clickNextPage(page);
        if (!navOK) {
          logger.error('Navigation failed');
          break;
        }
        currentPage++;
      }

      await delay(1200);
    }

  } catch (error) {
    logger.error('Fatal:', error);
  } finally {
    console.log('\n' + '='.repeat(60));
    console.log(`SUMMARY: #${START_ENTRY}-${TARGET_ENTRIES}`);
    console.log('='.repeat(60));
    console.log(`Processed: ${totalProcessed}`);
    console.log(`Successful: ${totalSuccessful}`);
    console.log(`Failed: ${totalProcessed - totalSuccessful}`);
    if (totalProcessed > 0) {
      console.log(`Success Rate: ${((totalSuccessful / totalProcessed) * 100).toFixed(1)}%`);
    }
    const completed = Math.min(globalSerial - 1, TARGET_ENTRIES);
    console.log(`Completed: #11 to #${completed}`);
    console.log(`Remaining: ${Math.max(0, TARGET_ENTRIES - completed)}`);
    console.log('='.repeat(60) + '\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
