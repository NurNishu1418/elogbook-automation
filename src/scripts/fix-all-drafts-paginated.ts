/**
 * Fix ALL draft entries across ALL pages
 * Loop through pagination and process every single entry
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

async function fixCurrentEntry(page: Page, entryNum: number): Promise<boolean> {
  try {
    const dateInputs = await page.locator('input[type="date"], input[name*="date" i]').all();
    let dateFixed = false;

    for (let i = 0; i < dateInputs.length; i++) {
      const value = await dateInputs[i].inputValue();
      if (value) {
        const newValue = await transformDate(value);
        if (newValue !== value) {
          logger.info(`[E${entryNum}] Date[${i}]: ${value} → ${newValue}`);
          await dateInputs[i].fill(newValue);
          dateFixed = true;
        }
      }
    }

    if (!dateFixed) return false;

    await delay(500);
    const saveBtn = await page.locator('button:has-text("Save as Draft"), button:has-text("Save"), button[type="submit"]').first();
    if (saveBtn && await saveBtn.isVisible()) {
      await saveBtn.click();
      await delay(2000);
      logger.info(`[E${entryNum}] ✓ Saved`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`[E${entryNum}] Error:`, error);
    return false;
  }
}

async function processCurrentPage(page: Page, pageNum: number): Promise<{ fixed: number; failed: number; entryStart: number }> {
  let fixed = 0;
  let failed = 0;
  let entryStart = (pageNum - 1) * 100 + 1;

  try {
    await delay(2000);

    const draftLinks = await page.locator(
      'a[href*="/trainee/logbook-entry/"], button:has-text("Edit"), .entry-link'
    ).all();

    logger.info(`\n=== PAGE ${pageNum} === Found ${draftLinks.length} entries`);

    for (let i = 0; i < draftLinks.length; i++) {
      try {
        await delay(800);
        const entryNum = entryStart + i;

        const linkText = await draftLinks[i].textContent();
        logger.info(`[E${entryNum}] Opening...`);

        await draftLinks[i].click();
        await delay(2500);

        const success = await fixCurrentEntry(page, entryNum);
        if (success) {
          fixed++;
        } else {
          failed++;
        }

        // Go back
        await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
        await delay(1500);

        // Re-fetch links for this page
        const updatedLinks = await page.locator(
          'a[href*="/trainee/logbook-entry/"], button:has-text("Edit"), .entry-link'
        ).all();

        if (i < updatedLinks.length) {
          draftLinks[i] = updatedLinks[i];
        }

      } catch (error) {
        logger.error(`[E${entryStart + i}] Error:`, error);
        failed++;
        try {
          await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
          await delay(1500);
        } catch (e) {}
      }
    }

    logger.info(`PAGE ${pageNum} SUMMARY: Fixed=${fixed}, Failed=${failed}`);
    return { fixed, failed, entryStart };

  } catch (error) {
    logger.error(`Page ${pageNum} error:`, error);
    return { fixed: 0, failed: 0, entryStart };
  }
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  let totalFixed = 0;
  let totalFailed = 0;
  let pageNum = 1;
  const maxPages = 100;

  try {
    logger.info('=== FIX ALL DRAFT ENTRIES (PAGINATED) ===');

    // Login
    logger.info('Logging in...');
    const loginResult = await login(page);
    if (!loginResult.success) {
      throw new Error(`Login failed: ${loginResult.reason}`);
    }
    logger.info('✓ Login successful\n');

    // Process all pages
    while (pageNum <= maxPages) {
      logger.info(`\nNavigating to page ${pageNum}...`);

      await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });

      // Add page parameter if needed
      if (pageNum > 1) {
        const pageUrl = `${DRAFT_LIST_URL}&page=${pageNum}`;
        await page.goto(pageUrl, { waitUntil: 'networkidle' });
      }

      await delay(2000);

      // Process this page
      const { fixed, failed } = await processCurrentPage(page, pageNum);
      totalFixed += fixed;
      totalFailed += failed;

      // Check if there's a next button
      const nextBtn = await page.locator(
        'button:has-text("Next"), a:has-text("Next"), [aria-label*="Next"], li.next a'
      ).first();

      const hasNextPage = nextBtn && await nextBtn.isEnabled().catch(() => false);

      if (!hasNextPage || (fixed === 0 && failed === 0)) {
        logger.info(`\n✓ Reached last page or no more entries. Stopping.`);
        break;
      }

      pageNum++;
      if (pageNum > maxPages) {
        logger.warn(`\nReached max page limit (${maxPages}). Stopping.`);
        break;
      }
    }

  } catch (error) {
    logger.error('Fatal error:', error);
  } finally {
    console.log('\n' + '='.repeat(50));
    console.log('FINAL SUMMARY - ALL PAGES');
    console.log('='.repeat(50));
    console.log(`Total Fixed: ${totalFixed}`);
    console.log(`Total Failed: ${totalFailed}`);
    console.log(`Total Processed: ${totalFixed + totalFailed}`);
    console.log(`Pages Processed: ${pageNum - 1}`);
    console.log('='.repeat(50) + '\n');

    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
