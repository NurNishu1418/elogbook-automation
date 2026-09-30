/**
 * TEST: Filter by Draft Status and inspect results
 * Purpose: Verify that filtering makes entries consolidated at beginning
 */

import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';

const DRAFT_LIST_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1789898604371';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  try {
    logger.info('='.repeat(60));
    logger.info('TEST: Filter by Draft Status');
    logger.info('='.repeat(60) + '\n');

    // Login
    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');
    logger.info('✓ Login OK\n');
    await delay(1000);

    // Go to draft list
    logger.info('Going to draft list...');
    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(2000);
    logger.info('✓ On draft list\n');

    // Look for Status filter/dropdown
    logger.info('Looking for Status filter...\n');

    // Try to find status filter - could be select, input, or button
    const statusSelects = await page.locator('select[name*="status" i], select[name*="Status" i]').all();
    const statusInputs = await page.locator('input[name*="status" i], input[name*="Status" i]').all();
    const statusButtons = await page.locator('button:has-text("Draft"), button:has-text("STATUS")').all();

    logger.info(`Found ${statusSelects.length} select elements with 'status'`);
    logger.info(`Found ${statusInputs.length} input elements with 'status'`);
    logger.info(`Found ${statusButtons.length} button elements with 'Draft/Status'`);

    // Try to find any visible filter controls
    const filterArea = page.locator('[class*="filter" i], [class*="Filter" i]');
    const filterVisible = await filterArea.isVisible().catch(() => false);
    logger.info(`Filter area visible: ${filterVisible}\n`);

    // Print page HTML to see filter structure
    logger.info('Looking for Draft option in page...');
    const allText = await page.locator('body').textContent();
    if (allText?.includes('Draft')) {
      logger.info('✓ Found "Draft" text on page');
    }

    // Look for clickable Draft status option
    const draftOptions = await page.locator('text=Draft').all();
    logger.info(`Found ${draftOptions.length} "Draft" elements\n`);

    if (draftOptions.length > 0) {
      for (let i = 0; i < Math.min(draftOptions.length, 3); i++) {
        const visible = await draftOptions[i].isVisible().catch(() => false);
        const text = await draftOptions[i].textContent().catch(() => 'unknown');
        logger.info(`  [${i}] "${text}" - visible: ${visible}`);
      }
    }

    logger.info('\n' + '='.repeat(60));
    logger.info('NEXT STEP: Inspect the portal manually or click Draft filter');
    logger.info('Then click the SUBMIT button to apply filter');
    logger.info('='.repeat(60) + '\n');

    // Keep page open for 30 seconds so user can interact
    logger.info('Browser will stay open for 30 seconds...');
    logger.info('Interact with the page now if needed!\n');
    await delay(30000);

    // Take screenshot of current state
    logger.info('Taking screenshot of current state...');
    await page.screenshot({ path: './test-draft-filter-screenshot.png' });
    logger.info('✓ Screenshot saved to test-draft-filter-screenshot.png\n');

  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await context.close();
    await browser.close();
    logger.info('Browser closed');
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
