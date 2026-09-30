/**
 * Fix all drafts by going through each page (10 entries per page)
 * Process entries 11-864 across all pages
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { env } from '../utils/env';
import { Page } from 'playwright';

const MONTH_MAP: { [key: string]: string } = {
  '01': '07', '02': '09', '03': '09', '04': '08', '05': '08', '06': '09',
  '07': '07', '08': '08', '09': '09', '10': '10', '11': '11', '12': '12',
};

const DRAFT_LIST_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1789898604371';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function transformDate(dateStr: string): Promise<string> {
  if (!dateStr) return dateStr;
  const match1 = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match1) {
    const [, day, month, year] = match1;
    const newMonth = MONTH_MAP[month] || month;
    return `${day}/${newMonth}/${year}`;
  }
  const match2 = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match2) {
    const [, year, month, day] = match2;
    const newMonth = MONTH_MAP[month] || month;
    return `${year}-${newMonth}-${day}`;
  }
  return dateStr;
}

async function fixEntry(page: Page, entryNum: number): Promise<boolean> {
  try {
    const dateInputs = await page.locator('input[type="date"], input[name*="date" i]').all();
    let dateFixed = false;

    for (const dateInput of dateInputs) {
      const value = await dateInput.inputValue();
      if (value) {
        const newValue = await transformDate(value);
        if (newValue !== value) {
          logger.info(`    Date: ${value} → ${newValue}`);
          await dateInput.fill(newValue);
          dateFixed = true;
        }
      }
    }

    if (!dateFixed) return false;

    await delay(500);
    const saveBtn = await page.locator('button:has-text("Save as Draft"), button:has-text("Save"), button[type="submit"]').first();
    if (saveBtn && await saveBtn.isVisible()) {
      await saveBtn.click();
      await delay(1500);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`    Error:`, error);
    return false;
  }
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let totalFixed = 0;
  let totalSkipped = 0;
  let entryCounter = 11;  // Start from entry 11 (skip first 10)
  let pageNum = 2;  // First 10 entries are on page 1, start from page 2

  try {
    logger.info('=== FIX ALL DRAFTS - PAGE BY PAGE ===\n');

    // Login
    logger.info('Logging in...');
    const loginResult = await login(page);
    if (!loginResult.success) throw new Error(`Login failed: ${loginResult.reason}`);
    logger.info('✓ Login successful\n');

    // Go to draft list page 2 (skip first 10)
    const PAGE_2_URL = `${DRAFT_LIST_URL}&page=2`;
    await page.goto(PAGE_2_URL, { waitUntil: 'networkidle' });
    await delay(2000);
    logger.info('Starting from Page 2 (Entry 11)...');

    // Process all pages
    let hasNextPage = true;
    while (hasNextPage && entryCounter <= 870) {
      logger.info(`\n========== PAGE ${pageNum} (Entries ${entryCounter}-${entryCounter + 9}) ==========`);

      await delay(1000);

      // Find all edit buttons on current page
      const editButtons = await page.locator('a[href*="/trainee/logbook-entry/"], button:has-text("Edit")').all();

      if (editButtons.length === 0) {
        logger.warn(`No entries found on page ${pageNum}. Stopping.`);
        break;
      }

      logger.info(`Found ${editButtons.length} entries on this page`);

      // Process each entry on this page
      for (let i = 0; i < editButtons.length; i++) {
        try {
          logger.info(`\n[E${entryCounter}] Opening...`);
          await delay(700);

          // Click edit
          await editButtons[i].click();
          await delay(2500);

          // Fix dates
          const fixed = await fixEntry(page, entryCounter);

          if (fixed) {
            logger.info(`[E${entryCounter}] ✓ FIXED`);
            totalFixed++;
          } else {
            logger.info(`[E${entryCounter}] - Skipped (no change)`);
            totalSkipped++;
          }

          entryCounter++;

          // Go back to list
          await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
          await delay(1500);

        } catch (error) {
          logger.error(`[E${entryCounter}] Error:`, error);
          entryCounter++;
          try {
            await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
            await delay(1500);
          } catch (e) {}
        }
      }

      // Look for next page button
      const nextBtn = await page.locator(
        'a:has-text("Next"), button:has-text("Next"), [aria-label*="Next"]'
      ).first();

      hasNextPage = nextBtn && await nextBtn.isEnabled().catch(() => false);

      if (hasNextPage) {
        logger.info(`\n→ Moving to next page...`);
        await nextBtn.click();
        await page.waitForLoadState('networkidle');
        await delay(2000);
        pageNum++;
      } else {
        logger.info(`\n✓ No more pages. Stopping.`);
      }
    }

  } catch (error) {
    logger.error('Fatal error:', error);
  } finally {
    console.log('\n' + '='.repeat(70));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(70));
    console.log(`Pages processed: ${pageNum}`);
    console.log(`Total entries processed: ${entryCounter - 1}`);
    console.log(`Fixed: ${totalFixed}`);
    console.log(`Skipped (already correct): ${totalSkipped}`);
    console.log('='.repeat(70) + '\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
