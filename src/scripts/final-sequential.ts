/**
 * FINAL v3: Click Submit Button
 * Draft List → Filter → Entry → Update Date → Click "Submit" → Repeat
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
    logger.info('FINAL v3: Click SUBMIT Button');
    logger.info('='.repeat(60) + '\n');

    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');
    logger.info('✓ Login OK\n');
    await delay(1000);

    let entryNum = 1;
    let noMoreEntries = false;

    while (!noMoreEntries) {
      try {
        logger.info(`\n========== ENTRY #${entryNum} ==========`);

        // STEP 1: Go to Draft List
        logger.info('[1] Going to Draft List...');
        await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
        await delay(2000);

        // STEP 2: Apply Draft Filter
        logger.info('[2] Applying Draft Filter...');
        const statusSelect = page.locator('select[name*="status" i]').first();
        if (await statusSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await statusSelect.selectOption({ label: 'Draft' });
          await delay(500);
        }

        // STEP 3: Click Search
        logger.info('[3] Clicking Search...');
        const searchBtn = page.locator('button:has-text("Search"), button:has-text("Submit")').first();
        if (await searchBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await searchBtn.click();
          await delay(2000);
        }

        // STEP 4: Find & Open First Entry
        logger.info('[4] Opening first entry...');
        const firstEntry = page.locator('a[href*="/trainee/logbook-entry/"], button:has-text("Edit")').first();
        const exists = await firstEntry.isVisible({ timeout: 2000 }).catch(() => false);

        if (!exists) {
          logger.info('✓ NO MORE ENTRIES - COMPLETED!');
          noMoreEntries = true;
          break;
        }

        await firstEntry.click();
        await delay(4000);

        // STEP 5: Update Date Field
        logger.info('[5] Updating Date...');
        const dateField = page.locator('[name="Date of Assignment"]').first();

        try {
          await dateField.waitFor({ state: 'visible', timeout: 3000 });
          const currentValue = await dateField.inputValue();
          const targetMonth = getMonthForEntryNum(entryNum);
          const newValue = updateDateMonth(currentValue, targetMonth);

          if (newValue !== currentValue) {
            await dateField.fill(newValue);
            await delay(500);
            logger.info(`  ${currentValue} → ${newValue}`);
          } else {
            logger.info(`  No change (same month)`);
          }
        } catch (error) {
          logger.error(`  Date error: ${error}`);
          totalProcessed++;
          entryNum++;
          continue;
        }

        // STEP 6: Click SUBMIT Button (not Save as Draft)
        logger.info('[6] Clicking "Submit" button...');

        const submitBtn = page.locator('button:has-text("Submit")').first();

        try {
          const btnVisible = await submitBtn.isVisible({ timeout: 2000 }).catch(() => false);

          if (btnVisible) {
            await submitBtn.click();
            await delay(2500);
            logger.info('✓ SUBMITTED!');
            totalSuccessful++;
            totalProcessed++;
          } else {
            logger.error('  Submit button not found');
            totalProcessed++;
          }
        } catch (error) {
          logger.error(`  Submit click error: ${error}`);
          totalProcessed++;
        }

        entryNum++;

      } catch (error) {
        logger.error(`ERROR: ${error}`);
        totalProcessed++;
        entryNum++;

        try {
          await page.goto(DRAFT_LIST_URL);
          await delay(1500);
        } catch (e) {
          // Recovery failed, continue anyway
        }
      }
    }

  } catch (error) {
    logger.error('FATAL:', error);
  } finally {
    console.log('\n' + '='.repeat(60));
    console.log('FINAL RESULT');
    console.log('='.repeat(60));
    console.log(`Processed: ${totalProcessed}`);
    console.log(`Successful: ${totalSuccessful}`);
    console.log(`Failed: ${totalProcessed - totalSuccessful}`);
    if (totalProcessed > 0) {
      console.log(`Success Rate: ${((totalSuccessful / totalProcessed) * 100).toFixed(1)}%`);
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
