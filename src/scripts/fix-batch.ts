/**
 * Fix drafts in small batches (50 entries per batch)
 * Start from entry 11, process in chunks
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { Page } from 'playwright';

const MONTH_MAP: { [key: string]: string } = {
  '01': '07', '02': '09', '03': '09', '04': '08', '05': '08', '06': '09',
  '07': '07', '08': '08', '09': '09', '10': '10', '11': '11', '12': '12',
};

const DRAFT_LIST_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1789898604371';
const BATCH_SIZE = 50;
const START_ENTRY = 11;
const END_ENTRY = 864;

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
          logger.info(`    ${value} → ${newValue}`);
          await dateInput.fill(newValue);
          dateFixed = true;
        }
      }
    }

    if (!dateFixed) return false;

    await delay(300);
    const saveBtn = await page.locator('button:has-text("Save as Draft"), button:has-text("Save"), button[type="submit"]').first();
    if (saveBtn && await saveBtn.isVisible()) {
      await saveBtn.click();
      await delay(1200);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`    Error:`, error);
    return false;
  }
}

async function processBatch(batchNum: number): Promise<{ fixed: number; skipped: number; error: boolean }> {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let fixed = 0;
  let skipped = 0;

  try {
    const startEntry = START_ENTRY + (batchNum - 1) * BATCH_SIZE;
    const endEntry = Math.min(startEntry + BATCH_SIZE - 1, END_ENTRY);

    logger.info(`\n${'='.repeat(70)}`);
    logger.info(`BATCH ${batchNum} (Entries ${startEntry}-${endEntry})`);
    logger.info(`${'='.repeat(70)}`);

    // Login
    logger.info('Logging in...');
    const loginResult = await login(page);
    if (!loginResult.success) throw new Error(`Login failed: ${loginResult.reason}`);
    logger.info('✓ Login successful');

    // Go to list
    const pageNum = Math.ceil(startEntry / 10);
    const pageUrl = pageNum > 1 ? `${DRAFT_LIST_URL}&page=${pageNum}` : DRAFT_LIST_URL;

    logger.info(`Going to page ${pageNum}...`);
    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    await delay(2000);

    // Calculate which button on this page
    const positionOnPage = ((startEntry - 1) % 10);

    // Process entries in this batch
    for (let entryNum = startEntry; entryNum <= endEntry; entryNum++) {
      try {
        logger.info(`\n[E${entryNum}] Opening...`);
        await delay(600);

        // Find edit button (may need to refetch for each entry)
        const editBtn = await page.locator('a[href*="/trainee/logbook-entry/"], button:has-text("Edit")').nth(0);
        await editBtn.click();
        await delay(2200);

        // Fix dates
        const success = await fixEntry(page, entryNum);
        if (success) {
          logger.info(`[E${entryNum}] ✓ FIXED`);
          fixed++;
        } else {
          logger.info(`[E${entryNum}] - OK (no change)`);
          skipped++;
        }

        // Go back
        await page.goto(pageUrl, { waitUntil: 'networkidle' });
        await delay(1500);

      } catch (error) {
        logger.error(`[E${entryNum}] Error:`, error);
        skipped++;
      }
    }

  } catch (error) {
    logger.error(`Batch ${batchNum} fatal error:`, error);
    return { fixed, skipped, error: true };
  } finally {
    try {
      await context.close();
      await browser.close();
    } catch (e) {
      // ignore
    }
  }

  return { fixed, skipped, error: false };
}

async function main() {
  let grandTotalFixed = 0;
  let grandTotalSkipped = 0;

  logger.info(`\n${'*'.repeat(70)}`);
  logger.info(`BATCH PROCESSING MODE - ${BATCH_SIZE} ENTRIES PER BATCH`);
  logger.info(`Entries ${START_ENTRY} to ${END_ENTRY}`);
  logger.info(`Total batches: ${Math.ceil((END_ENTRY - START_ENTRY + 1) / BATCH_SIZE)}`);
  logger.info(`${'*'.repeat(70)}`);

  const numBatches = Math.ceil((END_ENTRY - START_ENTRY + 1) / BATCH_SIZE);

  for (let batchNum = 1; batchNum <= numBatches; batchNum++) {
    try {
      const { fixed, skipped, error } = await processBatch(batchNum);
      grandTotalFixed += fixed;
      grandTotalSkipped += skipped;

      logger.info(`\nBatch ${batchNum} result: Fixed=${fixed}, Skipped=${skipped}`);

      if (error) {
        logger.warn(`Batch ${batchNum} had errors. Continuing...`);
      }

      // Brief pause between batches
      if (batchNum < numBatches) {
        logger.info(`\nPausing 3 seconds before next batch...`);
        await delay(3000);
      }

    } catch (error) {
      logger.error(`Batch ${batchNum} processing error:`, error);
    }
  }

  console.log(`\n${'#'.repeat(70)}`);
  console.log(`FINAL SUMMARY`);
  console.log(`${'#'.repeat(70)}`);
  console.log(`Total Fixed: ${grandTotalFixed}`);
  console.log(`Total Skipped: ${grandTotalSkipped}`);
  console.log(`Total Processed: ${grandTotalFixed + grandTotalSkipped}`);
  console.log(`Batches Completed: ${numBatches}`);
  console.log(`${'#'.repeat(70)}\n`);
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
