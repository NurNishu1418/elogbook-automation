/**
 * TEST: Process only Page 2 (Entries #11-20)
 * Verify we can complete one full page without browser crash
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

async function updateEntry(page: Page, globalSerial: number): Promise<boolean> {
  try {
    const targetMonth = getMonthForEntryNum(globalSerial);
    logger.info(`[#${globalSerial}] Month: ${targetMonth}`);

    await delay(100);

    const dateField = page.locator('[name="Date of Assignment"]').first();

    try {
      await dateField.waitFor({ state: 'visible', timeout: 1200 });
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
    await delay(100);

    const saveBtn = await page.locator(
      'button:has-text("Save as Draft"), button:has-text("Save"), button[type="submit"]'
    ).first();

    if (!saveBtn || !(await saveBtn.isVisible())) {
      logger.error(`[#${globalSerial}] No save button`);
      return false;
    }

    await saveBtn.click();
    await delay(1000);

    logger.info(`[#${globalSerial}] ${currentValue} → ${newValue} ✓`);
    return true;

  } catch (error) {
    logger.error(`[#${globalSerial}] Error:`, error);
    return false;
  }
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let totalSuccessful = 0;
  let totalFailed = 0;

  try {
    logger.info('='.repeat(60));
    logger.info('TEST: Page 2 only (Entries #11-20)');
    logger.info('='.repeat(60) + '\n');

    // Login
    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');
    logger.info('✓ Login OK\n');
    await delay(1000);

    // Go to listing
    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(1500);

    // Go to Page 2
    logger.info('Going to Page 2...');
    const nextBtn = page.locator('button[aria-label="Next Page"]').first();
    await nextBtn.click();
    await delay(2000);
    logger.info('✓ On Page 2\n');

    // Get entry links
    const entryLinks = await page.locator(
      'a[href*="/trainee/logbook-entry/"], button:has-text("Edit")'
    ).all();

    logger.info(`Found ${entryLinks.length} entries on page 2\n`);

    // Process entries 11-20
    for (let i = 0; i < Math.min(entryLinks.length, 10); i++) {
      const entryNum = 11 + i;

      logger.info(`\n--- Entry #${entryNum} ---`);

      try {
        await delay(200);
        await entryLinks[i].click();
        await delay(2000);

        const success = await updateEntry(page, entryNum);
        if (success) {
          totalSuccessful++;
        } else {
          totalFailed++;
        }

        // Back to list
        await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
        await delay(1200);

        // Re-navigate to page 2
        if (i < 9) {
          const nextBtn2 = page.locator('button[aria-label="Next Page"]').first();
          await nextBtn2.click();
          await delay(1500);
        }

      } catch (error) {
        logger.error(`Error on entry #${entryNum}:`, error);
        totalFailed++;
      }
    }

  } catch (error) {
    logger.error('Fatal:', error);
  } finally {
    console.log('\n' + '='.repeat(60));
    console.log('RESULT: Page 2 (Entries #11-20)');
    console.log('='.repeat(60));
    console.log(`Successful: ${totalSuccessful}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Total: ${totalSuccessful + totalFailed}`);
    if (totalSuccessful + totalFailed > 0) {
      console.log(`Success Rate: ${((totalSuccessful / (totalSuccessful + totalFailed)) * 100).toFixed(1)}%`);
    }
    console.log('='.repeat(60) + '\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
