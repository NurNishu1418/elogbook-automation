/**
 * DEBUG: Inspect entry links on draft list page
 * Find the correct selector for entry links
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
    logger.info('DEBUG: Find Entry Link Selectors');
    logger.info('='.repeat(60) + '\n');

    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');
    logger.info('✓ Login OK\n');
    await delay(1000);

    logger.info('Going to draft list...');
    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(2000);
    logger.info('✓ On draft list\n');

    // Try different selectors
    const selectors = [
      'a[href*="/trainee/logbook-entry/"]',
      'a[href*="logbook-entry"]',
      'button:has-text("Edit")',
      'tr:first-child a',
      'table tbody tr:first-child a',
      'table tbody tr:first-child button',
      '[class*="edit" i]',
      'a:first-of-type',
    ];

    for (const selector of selectors) {
      const elements = await page.locator(selector).all();
      logger.info(`Selector: "${selector}"`);
      logger.info(`  Found: ${elements.length} elements`);

      if (elements.length > 0) {
        const visible = await elements[0].isVisible().catch(() => false);
        const text = await elements[0].textContent().catch(() => 'N/A');
        const href = await elements[0].getAttribute('href').catch(() => 'N/A');

        logger.info(`  [0] visible: ${visible}, text: "${text}", href: "${href}"`);
      }
    }

    logger.info('\n' + '='.repeat(60));
    logger.info('Inspecting page HTML structure...');
    logger.info('='.repeat(60) + '\n');

    // Get page content to see structure
    const bodyText = await page.locator('body').innerHTML();
    const bodyLength = bodyText.length;
    logger.info(`Page HTML length: ${bodyLength} characters`);

    // Look for table rows
    const rows = await page.locator('tr').all();
    logger.info(`Total table rows: ${rows.length}`);

    if (rows.length > 0) {
      logger.info('\nFirst 3 rows content:');
      for (let i = 0; i < Math.min(3, rows.length); i++) {
        const rowText = await rows[i].textContent();
        logger.info(`  Row ${i + 1}: "${rowText?.substring(0, 100)}..."`);
      }
    }

    logger.info('\n' + '='.repeat(60));
    logger.info('Taking screenshot...');
    await page.screenshot({ path: './debug-entry-links-screenshot.png' });
    logger.info('✓ Screenshot saved\n');

  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
