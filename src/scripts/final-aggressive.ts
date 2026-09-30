/**
 * AGGRESSIVE: Scroll into view + Force Click + Enter as backup
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

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let totalSuccessful = 0;
  let totalProcessed = 0;

  try {
    logger.info('='.repeat(60));
    logger.info('AGGRESSIVE: Scroll + Force Click + Enter');
    logger.info('='.repeat(60) + '\n');

    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');
    logger.info('✓ Login OK\n');
    await delay(1000);

    let entryNum = 1;
    let noMoreEntries = false;

    while (!noMoreEntries) {
      try {
        logger.info(`\n>>> ENTRY #${entryNum}`);

        // Go to list
        await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
        await delay(2000);

        // Filter
        const statusSelect = page.locator('select[name*="status" i]').first();
        if (await statusSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await statusSelect.selectOption({ label: 'Draft' });
          const searchBtn = page.locator('button:has-text("Search"), button:has-text("Submit")').first();
          if (await searchBtn.isVisible().catch(() => false)) {
            await searchBtn.click();
            await delay(2000);
          }
        }

        // Open entry
        const firstEntry = page.locator('a[href*="/trainee/logbook-entry/"], button:has-text("Edit")').first();
        const exists = await firstEntry.isVisible({ timeout: 2000 }).catch(() => false);

        if (!exists) {
          logger.info('✓ DONE - No more entries');
          noMoreEntries = true;
          break;
        }

        await firstEntry.click();
        await delay(4000);

        // Update date
        const dateField = page.locator('[name="Date of Assignment"]').first();
        let dateUpdated = false;

        try {
          await dateField.waitFor({ state: 'visible', timeout: 3000 });
          const currentValue = await dateField.inputValue();
          const targetMonth = getMonthForEntryNum(entryNum);
          const newValue = updateDateMonth(currentValue, targetMonth);

          if (newValue !== currentValue) {
            await dateField.fill(newValue);
            await delay(500);
            logger.info(`  Date: ${currentValue} → ${newValue}`);
            dateUpdated = true;
          }
        } catch (error) {
          logger.error(`  Date error`);
          totalProcessed++;
          entryNum++;
          continue;
        }

        // AGGRESSIVE SUBMIT STRATEGIES
        logger.info('  Submitting...');
        let submitted = false;

        // Strategy 1: Scroll into view and click
        try {
          const submitBtn = page.locator('button:has-text("Submit")').first();
          await submitBtn.scrollIntoViewIfNeeded();
          await delay(300);
          await submitBtn.click({ force: true });
          await delay(2000);
          logger.info('  ✓ Submitted (Strategy 1: Click)');
          submitted = true;
        } catch (e1) {
          logger.warn('  Strategy 1 failed');
        }

        // Strategy 2: Try pressing Enter
        if (!submitted) {
          try {
            await page.press('button', 'Enter');
            await delay(2000);
            logger.info('  ✓ Submitted (Strategy 2: Enter)');
            submitted = true;
          } catch (e2) {
            logger.warn('  Strategy 2 failed');
          }
        }

        // Strategy 3: Try Tab + Enter
        if (!submitted) {
          try {
            await page.keyboard.press('Tab');
            await delay(200);
            await page.keyboard.press('Enter');
            await delay(2000);
            logger.info('  ✓ Submitted (Strategy 3: Tab+Enter)');
            submitted = true;
          } catch (e3) {
            logger.warn('  Strategy 3 failed');
          }
        }

        if (submitted) {
          totalSuccessful++;
        }
        totalProcessed++;
        entryNum++;

      } catch (error) {
        logger.error(`ERROR: ${error}`);
        totalProcessed++;
        entryNum++;
      }
    }

  } catch (error) {
    logger.error('FATAL:', error);
  } finally {
    console.log('\n' + '='.repeat(60));
    console.log('RESULT');
    console.log('='.repeat(60));
    console.log(`Processed: ${totalProcessed}`);
    console.log(`Successful: ${totalSuccessful}`);
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
