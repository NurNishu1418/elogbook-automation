/**
 * Fix drafts starting from entry 11 with 200 rows per page
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

    for (let i = 0; i < dateInputs.length; i++) {
      const value = await dateInputs[i].inputValue();
      if (value) {
        const newValue = await transformDate(value);
        if (newValue !== value) {
          logger.info(`  [E${entryNum}] Date[${i}]: ${value} → ${newValue}`);
          await dateInputs[i].fill(newValue);
          dateFixed = true;
        }
      }
    }

    if (!dateFixed) {
      logger.info(`  [E${entryNum}] No change needed`);
      return false;
    }

    await delay(500);
    const saveBtn = await page.locator('button:has-text("Save as Draft"), button:has-text("Save"), button[type="submit"]').first();
    if (saveBtn && await saveBtn.isVisible()) {
      await saveBtn.click();
      await delay(1500);
      logger.info(`  [E${entryNum}] ✓ Saved`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`  [E${entryNum}] Error:`, error);
    return false;
  }
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let totalFixed = 0;
  let totalSkipped = 0;

  try {
    logger.info('=== FIX DRAFTS FROM ENTRY 11 ===');

    // Login
    logger.info('Logging in...');
    const loginResult = await login(page);
    if (!loginResult.success) throw new Error(`Login failed: ${loginResult.reason}`);
    logger.info('✓ Login successful\n');

    // Go to draft list
    logger.info('Going to draft list...');
    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(2000);

    // Set rows per page to 200
    logger.info('Setting rows per page to 200...');
    try {
      const rowsDropdown = await page.locator('select[name*="pageSize"], select[name*="page"], button:has-text("10")').first();

      if (rowsDropdown) {
        await rowsDropdown.click();
        await delay(500);

        // Look for 200 option
        const option200 = await page.locator('option:has-text("200"), li:has-text("200"), button:has-text("200")').first();
        if (option200 && await option200.isVisible()) {
          await option200.click();
          await delay(2000);
          logger.info('✓ Changed to 200 rows per page\n');
        }
      }
    } catch (e) {
      logger.warn('Could not change rows per page, continuing with default');
    }

    await delay(1500);

    // Find all edit buttons
    const allButtons = await page.locator('a[href*="/trainee/logbook-entry/"], button:has-text("Edit")').all();
    logger.info(`Found ${allButtons.length} total edit buttons\n`);

    // Skip first 10, start from 11
    const startIndex = 10;

    for (let i = startIndex; i < allButtons.length && i < 250; i++) {
      const entryNum = i + 1;

      try {
        logger.info(`Opening entry ${entryNum}...`);
        await delay(800);

        await allButtons[i].click();
        await delay(2500);

        const fixed = await fixEntry(page, entryNum);
        if (fixed) {
          totalFixed++;
        } else {
          totalSkipped++;
        }

        // Go back and re-fetch buttons
        await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
        await delay(1500);

        const updatedButtons = await page.locator('a[href*="/trainee/logbook-entry/"], button:has-text("Edit")').all();
        if (i < updatedButtons.length) {
          allButtons[i] = updatedButtons[i];
        }

      } catch (error) {
        logger.error(`Error with entry ${entryNum}:`, error);
        try {
          await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
          await delay(1500);
        } catch (e) {}
      }

      // Progress update every 10 entries
      if ((i - startIndex + 1) % 10 === 0) {
        logger.info(`\n>> Progress: ${i - startIndex + 1} entries processed (Fixed: ${totalFixed}, Skipped: ${totalSkipped})\n`);
      }
    }

  } catch (error) {
    logger.error('Fatal error:', error);
  } finally {
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Fixed: ${totalFixed}`);
    console.log(`Skipped (already correct): ${totalSkipped}`);
    console.log(`Total Processed: ${totalFixed + totalSkipped}`);
    console.log('='.repeat(60) + '\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
