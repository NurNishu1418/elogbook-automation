/**
 * DEBUG: Find correct Date of Assignment field selector
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
    logger.info('DEBUG: Find Date of Assignment Field');
    logger.info('='.repeat(60) + '\n');

    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');
    logger.info('✓ Login OK\n');
    await delay(1000);

    // Go to draft list
    await page.goto(DRAFT_LIST_URL, { waitUntil: 'networkidle' });
    await delay(2000);

    // Apply filter
    const statusSelect = page.locator('select[name*="status" i]').first();
    if (await statusSelect.isVisible().catch(() => false)) {
      await statusSelect.selectOption({ label: 'Draft' });
      await delay(500);
      const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Search")').first();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await delay(2000);
      }
    }

    // Click first entry
    const firstEntry = page.locator('a[href*="/trainee/logbook-entry/"], button:has-text("Edit")').first();
    await firstEntry.click();
    await delay(3000);

    logger.info('Now on entry detail page. Looking for Date of Assignment field...\n');

    // Try different selectors
    const selectors = [
      '[name="Date of Assignment"]',
      '[name="date_of_assignment"]',
      '[name="dateOfAssignment"]',
      '[placeholder*="Date" i]',
      'input[type="date"]',
      'input[placeholder*="Assignment" i]',
      'input[placeholder*="Date" i]',
      'label:has-text("Date of Assignment") ~ input',
      '[class*="date" i]',
      'input:first-of-type',
    ];

    logger.info('Testing selectors:\n');
    for (const selector of selectors) {
      const elements = await page.locator(selector).all();
      const visible = elements.length > 0 ? await elements[0].isVisible().catch(() => false) : false;
      const value = visible ? await elements[0].inputValue().catch(() => 'N/A') : 'N/A';

      logger.info(`✓ "${selector}"`);
      logger.info(`  Found: ${elements.length}, Visible: ${visible}, Value: ${value}\n`);
    }

    logger.info('='.repeat(60));
    logger.info('Inspecting all form fields:');
    logger.info('='.repeat(60) + '\n');

    const allInputs = await page.locator('input').all();
    logger.info(`Total input fields: ${allInputs.length}\n`);

    for (let i = 0; i < Math.min(10, allInputs.length); i++) {
      const name = await allInputs[i].getAttribute('name').catch(() => 'N/A');
      const placeholder = await allInputs[i].getAttribute('placeholder').catch(() => 'N/A');
      const type = await allInputs[i].getAttribute('type').catch(() => 'text');
      const value = await allInputs[i].inputValue().catch(() => '');

      logger.info(`[${i}] name="${name}", placeholder="${placeholder}", type="${type}"`);
      logger.info(`    value="${value}"\n`);
    }

    logger.info('Taking screenshot...');
    await page.screenshot({ path: './debug-date-field-screenshot.png' });
    logger.info('✓ Saved to debug-date-field-screenshot.png\n');

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
