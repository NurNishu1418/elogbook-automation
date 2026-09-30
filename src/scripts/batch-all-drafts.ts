/**
 * BATCH: Process ALL Draft entries using Status filter
 * STRATEGY: Filter by Status=Draft first, then process from page 1
 * OPTIMIZATION: Much faster because no deep page navigation needed
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

async function navigateBackToList(page: Page, currentPage: number): Promise<void> {
  await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
  await delay(1200);

  // Re-apply Draft filter
  const statusSelect = page.locator('select[name*="status" i], select[name*="Status" i]').first();
  if (await statusSelect.isVisible()) {
    await statusSelect.selectOption({ label: 'Draft' });
    await delay(500);

    // Click submit if available
    const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Filter"), button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await delay(1500);
    }
  }

  // Navigate to current page
  for (let j = 1; j < currentPage; j++) {
    const nextBtn = page.locator('button[aria-label="Next Page"]').first();
    await nextBtn.click();
    await delay(1200);
  }
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let totalSuccessful = 0;
  let totalProcessed = 0;
  let currentEntry = 1;
  let currentPage = 1;

  try {
    logger.info('='.repeat(60));
    logger.info('BATCH: ALL Draft Entries (with Status filter)');
    logger.info('='.repeat(60) + '\n');

    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');
    logger.info('✓ Login OK\n');
    await delay(1000);

    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(1500);

    // Apply Draft Status filter
    logger.info('Applying Draft Status filter...');
    const statusSelect = page.locator('select[name*="status" i], select[name*="Status" i]').first();

    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption({ label: 'Draft' });
      await delay(500);
      logger.info('✓ Selected Draft\n');

      // Click submit button
      const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Filter"), button[type="submit"]').first();
      if (await submitBtn.isVisible()) {
        logger.info('Clicking Submit button...');
        await submitBtn.click();
        await delay(2000);
        logger.info('✓ Filter applied\n');
      }
    } else {
      logger.warn('Status dropdown not found, continuing anyway\n');
    }

    // Wait for filtered results to load
    await delay(1000);

    // Start processing from page 1
    logger.info('Starting to process filtered Draft entries...\n');

    while (true) {
      const entryLinks = await page.locator(
        'a[href*="/trainee/logbook-entry/"], button:has-text("Edit")'
      ).all();

      if (entryLinks.length === 0) {
        logger.info('No more entries found');
        break;
      }

      logger.info(`PAGE ${currentPage}: Processing ${entryLinks.length} entries`);

      for (let i = 0; i < entryLinks.length; i++) {
        try {
          await delay(200);
          await entryLinks[i].click();
          await delay(1800);

          const success = await updateEntry(page, currentEntry);
          totalProcessed++;
          if (success) totalSuccessful++;

          // Navigate back to list
          await navigateBackToList(page, currentPage);

          currentEntry++;

        } catch (error) {
          logger.error(`[#${currentEntry}] Error`);
          totalProcessed++;
          currentEntry++;
        }
      }

      // Try to move to next page
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
          logger.info('No more pages - done!\n');
          break;
        }
      } catch (e) {
        logger.info('Navigation completed\n');
        break;
      }
    }

  } catch (error) {
    logger.error('Fatal:', error);
  } finally {
    console.log('\n' + '='.repeat(60));
    console.log('BATCH RESULT: All Draft Entries');
    console.log('='.repeat(60));
    console.log(`Processed: ${totalProcessed}`);
    console.log(`Successful: ${totalSuccessful}`);
    console.log(`Failed: ${totalProcessed - totalSuccessful}`);
    if (totalProcessed > 0) {
      console.log(`Success Rate: ${((totalSuccessful / totalProcessed) * 100).toFixed(1)}%`);
    }
    console.log(`Total Entries: ${currentEntry - 1}`);
    console.log('='.repeat(60) + '\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
