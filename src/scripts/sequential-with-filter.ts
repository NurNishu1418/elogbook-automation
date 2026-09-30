/**
 * SEQUENTIAL WITH DRAFT FILTER + SEARCH
 * Every cycle: Status=Draft → Search → First entry → Update → Submit → Repeat
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

async function applyDraftFilterAndSearch(page: Page): Promise<boolean> {
  try {
    logger.info('   Looking for Status filter...');
    const statusSelect = page.locator('select[name*="status" i], select[name*="Status" i]').first();

    const visible = await statusSelect.isVisible({ timeout: 2000 }).catch(() => false);
    if (!visible) {
      logger.warn('   Status filter not found');
      return false;
    }

    logger.info('   Selecting "Draft"...');
    await statusSelect.selectOption({ label: 'Draft' });
    await delay(500);

    logger.info('   Clicking Search/Submit button...');
    const searchBtn = page.locator(
      'button:has-text("Search"), button:has-text("Submit"), button:has-text("Filter"), button[type="submit"]'
    ).first();

    const btnVisible = await searchBtn.isVisible({ timeout: 1500 }).catch(() => false);
    if (btnVisible) {
      await searchBtn.click();
      await delay(2500);
      logger.info('   ✓ Search executed');
      return true;
    } else {
      logger.warn('   Search button not found, trying Enter key...');
      await statusSelect.press('Enter');
      await delay(2000);
      return true;
    }

  } catch (error) {
    logger.error(`Filter error: ${error}`);
    return false;
  }
}

async function updateEntry(page: Page, entryNum: number): Promise<boolean> {
  try {
    const targetMonth = getMonthForEntryNum(entryNum);
    const dateField = page.locator('[name="Date of Assignment"]').first();

    await dateField.waitFor({ state: 'visible', timeout: 3000 });
    const currentValue = await dateField.inputValue();

    if (!currentValue) return false;

    const newValue = updateDateMonth(currentValue, targetMonth);
    if (newValue === currentValue) return false;

    await dateField.fill(newValue);
    await delay(200);

    const saveBtn = page.locator('button:has-text("Save as Draft"), button:has-text("Save"), button[type="submit"]').first();
    await saveBtn.waitFor({ state: 'visible', timeout: 1500 });
    await saveBtn.click();
    await delay(1500);

    logger.info(`   ✓ Updated: ${currentValue} → ${newValue}`);
    return true;

  } catch (error) {
    logger.error(`Update error: ${error}`);
    return false;
  }
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let totalSuccessful = 0;
  let totalProcessed = 0;

  try {
    logger.info('='.repeat(60));
    logger.info('SEQUENTIAL: Filter(Draft) → Search → Entry → Update → Submit');
    logger.info('='.repeat(60) + '\n');

    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');
    logger.info('✓ Login OK\n');
    await delay(1500);

    let entryNum = 1;
    let noMoreEntries = false;

    while (!noMoreEntries) {
      try {
        logger.info(`[Entry #${entryNum}]`);

        // Go to list
        logger.info('1. Going to draft list...');
        await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
        await delay(2000);

        // Apply Draft filter + Search
        logger.info('2. Applying Draft filter & searching...');
        await applyDraftFilterAndSearch(page);
        await delay(1000);

        // Find first entry
        logger.info('3. Looking for first entry...');
        const firstEntry = page.locator('a[href*="/trainee/logbook-entry/"], a[href*="logbook-entry"], button:has-text("Edit")').first();

        const exists = await firstEntry.isVisible({ timeout: 3000 }).catch(() => false);

        if (!exists) {
          logger.info('✓ No more Draft entries - Done!');
          noMoreEntries = true;
          break;
        }

        logger.info('4. Opening entry...');
        await firstEntry.click();
        await delay(4000);  // More time for page to fully load

        // Update
        logger.info('5. Updating entry...');
        const success = await updateEntry(page, entryNum);
        totalProcessed++;
        if (success) {
          totalSuccessful++;
        }

        entryNum++;

      } catch (error) {
        logger.error(`Cycle error: ${error}`);
        totalProcessed++;
        entryNum++;

        try {
          await page.goto(DRAFT_LIST_URL);
          await delay(1500);
        } catch (e) {
          logger.error('Recovery failed');
          await delay(2000);
        }
      }
    }

  } catch (error) {
    logger.error('Fatal:', error);
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
