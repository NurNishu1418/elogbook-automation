/**
 * DEBUG PAGINATION ONLY
 *
 * Inspect the actual DOM pagination controls and test navigation
 * WITHOUT editing any entries
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import { Page } from 'playwright';

const DRAFT_LIST_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1789898604371';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getPaginatorInfo(page: Page): Promise<string> {
  try {
    // Try to get paginator text showing "X-Y of Z"
    const paginatorTexts = [
      'text /\\d+-\\d+ of \\d+/',  // Common pattern
      '[class*="paginator"] >> text',
      '[class*="pagination"] >> text',
      '.p-paginator-current',
      '.mat-paginator-range-label'
    ];

    for (const selector of paginatorTexts) {
      try {
        const text = await page.locator(selector).first().textContent();
        if (text && text.includes('of')) {
          return text.trim();
        }
      } catch (e) {}
    }

    // Fallback: try to get table first row number
    const firstCell = await page.locator('table tbody tr:first-child td:first-child, table tbody tr:first-child td:nth-child(2)').textContent();
    return firstCell ? `First row content: ${firstCell.trim()}` : 'Could not determine paginator info';

  } catch (error) {
    logger.error('Error getting paginator info:', error);
    return 'Unknown';
  }
}

async function inspectPaginationDOM(page: Page): Promise<void> {
  logger.info('\n========== INSPECTING PAGINATION DOM ==========\n');

  // Get all button elements that might be pagination controls
  const buttons = await page.locator('button').all();
  logger.info(`Found ${buttons.length} total buttons on page`);

  logger.info('\nSearching for pagination buttons...\n');

  let buttonCount = 0;
  for (const btn of buttons) {
    buttonCount++;
    try {
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      const disabled = await btn.isDisabled();
      const className = await btn.getAttribute('class');

      // Only log buttons that might be pagination-related
      if (
        text?.includes('>') || text?.includes('<') || text?.includes('›') || text?.includes('«') ||
        ariaLabel?.toLowerCase().includes('page') || ariaLabel?.toLowerCase().includes('next') ||
        title?.toLowerCase().includes('page') || title?.toLowerCase().includes('next') ||
        className?.includes('paginator') || className?.includes('pagination')
      ) {
        logger.info(`\n--- Button ${buttonCount} ---`);
        logger.info(`Text: "${text?.trim()}"`);
        logger.info(`Aria-label: "${ariaLabel}"`);
        logger.info(`Title: "${title}"`);
        logger.info(`Disabled: ${disabled}`);
        logger.info(`Class: "${className}"`);
        logger.info(`HTML: <button>${text}</button>`);
      }
    } catch (e) {}
  }

  // Also check for div/span based paginator controls
  logger.info('\n========== CHECKING FOR PAGINATOR CONTAINER ==========\n');

  const paginatorSelectors = [
    '[class*="paginator"]',
    '[class*="pagination"]',
    '.p-paginator',
    '.mat-paginator',
    '[role="navigation"]'
  ];

  for (const selector of paginatorSelectors) {
    try {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        logger.info(`Found ${elements.length} elements with selector: ${selector}`);
        for (const el of elements) {
          const html = await el.innerHTML();
          logger.info(`HTML content: ${html.substring(0, 200)}...`);
        }
      }
    } catch (e) {}
  }
}

async function testPaginationClick(page: Page, clickAttemptNumber: number): Promise<boolean> {
  try {
    logger.info(`\n========== PAGINATION TEST #${clickAttemptNumber} ==========\n`);

    const beforeInfo = await getPaginatorInfo(page);
    logger.info(`BEFORE: ${beforeInfo}`);

    logger.info('\nAttempting to click Next Page button...\n');

    // Try different selectors for next button
    const nextButtonSelectors = [
      'button[aria-label*="next"], button[aria-label*="Next"]',
      'button:has-text(">"), button:has-text("›")',
      '[class*="paginator"] button:last-child',
      '.p-paginator-next',
      '.mat-paginator-increment',
      'button[title*="next"], button[title*="Next"]'
    ];

    let clicked = false;
    for (const selector of nextButtonSelectors) {
      try {
        const btns = await page.locator(selector).all();
        if (btns.length > 0) {
          const btn = btns[btns.length - 1]; // Try the last one (usually next)

          if (!(await btn.isDisabled())) {
            logger.info(`Trying selector: ${selector}`);
            await btn.click();
            clicked = true;
            logger.info('✓ Click executed');
            break;
          }
        }
      } catch (e) {}
    }

    if (!clicked) {
      logger.error('✗ Could not find clickable Next button');
      return false;
    }

    // Wait for page change
    logger.info('\nWaiting for table to update...');
    await delay(2000);

    const afterInfo = await getPaginatorInfo(page);
    logger.info(`AFTER: ${afterInfo}`);

    // Check if it actually changed
    if (beforeInfo !== afterInfo) {
      logger.info('\n✓✓✓ PAGE CHANGED SUCCESSFULLY! ✓✓✓');
      return true;
    } else {
      logger.warn('\n✗ Page did not change (before and after are the same)');
      return false;
    }

  } catch (error) {
    logger.error('Error during pagination test:', error);
    return false;
  }
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  try {
    logger.info('='.repeat(70));
    logger.info('PAGINATION DEBUG - NO DATA EDITING');
    logger.info('='.repeat(70));

    // Login
    logger.info('\nLogging in...');
    const loginResult = await login(page);
    if (!loginResult.success) {
      throw new Error(`Login failed: ${loginResult.reason}`);
    }
    logger.info('✓ Login successful\n');

    // Navigate to listing
    logger.info('Opening listing page...');
    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(2000);

    logger.info('✓ Listing loaded\n');

    // Get initial paginator state
    const initialState = await getPaginatorInfo(page);
    logger.info(`Initial paginator state: ${initialState}\n`);

    // Inspect DOM
    await inspectPaginationDOM(page);

    // Test pagination 3 times
    logger.info('\n========== RUNNING PAGINATION TESTS ==========\n');

    const test1 = await testPaginationClick(page, 1);
    await delay(1500);

    const test2 = test1 ? await testPaginationClick(page, 2) : false;
    await delay(1500);

    const test3 = test2 ? await testPaginationClick(page, 3) : false;

    // Summary
    logger.info('\n' + '='.repeat(70));
    logger.info('PAGINATION TEST RESULTS');
    logger.info('='.repeat(70));
    logger.info(`Test 1 (page 1→2): ${test1 ? '✓ PASS' : '✗ FAIL'}`);
    logger.info(`Test 2 (page 2→3): ${test2 ? '✓ PASS' : '✗ FAIL'}`);
    logger.info(`Test 3 (page 3→4): ${test3 ? '✓ PASS' : '✗ FAIL'}`);

    if (test1 && test2 && test3) {
      logger.info('\n✓✓✓ PAGINATION WORKS CORRECTLY ✓✓✓');
      logger.info('You can now proceed with the full automation!');
    } else {
      logger.error('\n✗✗✗ PAGINATION HAS ISSUES ✗✗✗');
      logger.error('Further debugging needed');
    }

    logger.info('='.repeat(70) + '\n');

  } catch (error) {
    logger.error('Fatal error:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
