/**
 * Fix Date of Assignment months in all draft entries
 * Month mapping:
 * 01 → 07 (January → July)
 * 02-03 → 09 (Feb-Mar → September)
 * 04 → 08 (April → August)
 * 05 → 08 (May → August)
 * 06 → 09 (June → September)
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { env } from '../utils/env';
import { Page } from 'playwright';

const MONTH_MAP: { [key: string]: string } = {
  '01': '07',
  '02': '09',
  '03': '09',
  '04': '08',
  '05': '08',
  '06': '09',
  '07': '07',
  '08': '08',
  '09': '09',
  '10': '10',
  '11': '11',
  '12': '12',
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

async function fixCurrentEntry(page: Page, entryNum: number): Promise<boolean> {
  try {
    logger.info(`[Entry ${entryNum}] Looking for date fields...`);

    // Find all date inputs
    const dateInputs = await page.locator('input[type="date"], input[name*="date" i], input[placeholder*="date" i]').all();
    logger.info(`[Entry ${entryNum}] Found ${dateInputs.length} date inputs`);

    let dateFixed = false;
    for (let i = 0; i < dateInputs.length; i++) {
      const value = await dateInputs[i].inputValue();
      if (value) {
        const newValue = await transformDate(value);
        if (newValue !== value) {
          logger.info(`[Entry ${entryNum}] Changing date[${i}]: ${value} → ${newValue}`);
          await dateInputs[i].fill(newValue);
          dateFixed = true;
        } else {
          logger.info(`[Entry ${entryNum}] Date[${i}] unchanged: ${value}`);
        }
      }
    }

    if (!dateFixed) {
      logger.warn(`[Entry ${entryNum}] No date transformation needed`);
      return false;
    }

    // Click Save as Draft button
    await delay(800);
    const saveBtn = await page.locator('button:has-text("Save as Draft"), button:has-text("Save"), button[type="submit"]').first();

    if (saveBtn && await saveBtn.isVisible()) {
      logger.info(`[Entry ${entryNum}] Clicking Save button...`);
      await saveBtn.click();
      await delay(2500);
      logger.info(`[Entry ${entryNum}] ✓ Saved`);
      return true;
    } else {
      logger.error(`[Entry ${entryNum}] Save button not found or not visible`);
      return false;
    }
  } catch (error) {
    logger.error(`[Entry ${entryNum}] Error:`, error);
    return false;
  }
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let fixedCount = 0;
  let failedCount = 0;
  let entryCount = 0;

  try {
    logger.info('=== FIX DRAFT ENTRY MONTHS ===');
    logger.info(`Using .env credentials: ${env.username}`);

    // Login
    logger.info('Logging in...');
    const loginResult = await login(page);
    if (!loginResult.success) {
      throw new Error(`Login failed: ${loginResult.reason}`);
    }
    logger.info('✓ Login successful');
    await delay(2000);

    // Go to draft list
    logger.info(`Going to draft list: ${DRAFT_LIST_URL}`);
    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(2500);

    // Change rows per page to 200
    logger.info('Setting rows per page to 200...');
    try {
      // Try to find and change rows per page dropdown
      const rowsSelector = await page.locator(
        'select[name*="pageSize"], ' +
        'select[name*="page_size"], ' +
        '[data-rows-per-page], ' +
        'button:has-text("10"), ' +
        'button:has-text("25"), ' +
        'button:has-text("50")'
      ).first();

      if (rowsSelector) {
        await rowsSelector.click();
        await delay(500);

        // Look for 200 option
        const option200 = await page.locator('option:has-text("200"), button:has-text("200"), li:has-text("200")').first();
        if (option200) {
          await option200.click();
          await delay(2000);
          logger.info('✓ Set to 200 rows per page');
        }
      }
    } catch (e) {
      logger.warn('Could not change rows per page:', e);
    }

    await delay(1500);

    // Find clickable draft entries (links, buttons, or table rows)
    const draftLinks = await page.locator(
      'a[href*="/trainee/logbook-entry/"], ' +
      'button:has-text("Edit"), ' +
      'tr[onclick], ' +
      '.entry-link, ' +
      '[role="button"]'
    ).all();

    logger.info(`Found ${draftLinks.length} potential draft links/buttons`);

    if (draftLinks.length === 0) {
      logger.warn('No draft entries found. Looking for alternative selectors...');
      const allLinks = await page.locator('a').all();
      logger.info(`Total links on page: ${allLinks.length}`);
    }

    // Process each draft (up to 200 per page)
    for (let i = 0; i < draftLinks.length && i < 200; i++) {
      try {
        entryCount++;
        await delay(1200);

        logger.info(`\n--- Entry ${entryCount} ---`);
        const linkText = await draftLinks[i].textContent();
        logger.info(`Opening: ${linkText?.substring(0, 60) || 'unknown'}`);

        // Click to open draft
        await draftLinks[i].click();
        await delay(3000);

        // Fix the dates
        const fixed = await fixCurrentEntry(page, entryCount);
        if (fixed) {
          fixedCount++;
        } else {
          failedCount++;
        }

        // Go back to draft list
        logger.info(`Going back to draft list...`);
        await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
        await delay(2500);

        // Re-fetch links as DOM may have changed
        const updatedLinks = await page.locator(
          'a[href*="/trainee/logbook-entry/"], ' +
          'button:has-text("Edit"), ' +
          'tr[onclick], ' +
          '.entry-link'
        ).all();

        if (i < updatedLinks.length) {
          draftLinks[i] = updatedLinks[i];
        }

      } catch (error) {
        logger.error(`Error processing entry ${entryCount}:`, error);
        failedCount++;
        // Try to go back
        try {
          await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
          await delay(2000);
        } catch (e) {
          // ignore
        }
      }
    }

  } catch (error) {
    logger.error('Fatal error:', error);
  } finally {
    console.log('\n==================================================');
    console.log('DRAFT MONTH FIX SUMMARY');
    console.log('==================================================');
    console.log(`Processed: ${entryCount}`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log('==================================================\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
