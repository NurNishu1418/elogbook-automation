/**
 * DEBUG: Find correct Submit/Save button selector
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
    logger.info('DEBUG: Find Submit Button Selector');
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
      const submitBtn = page.locator('button:has-text("Search"), button:has-text("Submit")').first();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await delay(2000);
      }
    }

    // Click first entry
    const firstEntry = page.locator('a[href*="/trainee/logbook-entry/"], button:has-text("Edit")').first();
    await firstEntry.click();
    await delay(4000);

    logger.info('Now on entry detail page. Looking for Save/Submit buttons...\n');

    // Find all buttons
    const allButtons = await page.locator('button').all();
    logger.info(`Total buttons found: ${allButtons.length}\n`);

    // Try different selectors
    const selectors = [
      'button:has-text("Save as Draft")',
      'button:has-text("Save")',
      'button:has-text("Submit")',
      'button[type="submit"]',
      'button:last-of-type',
    ];

    logger.info('Testing button selectors:\n');
    for (const selector of selectors) {
      const elements = await page.locator(selector).all();
      const visible = elements.length > 0 ? await elements[0].isVisible().catch(() => false) : false;
      const text = visible ? await elements[0].textContent().catch(() => 'N/A') : 'N/A';

      logger.info(`"${selector}"`);
      logger.info(`  Found: ${elements.length}, Visible: ${visible}, Text: "${text}"\n`);
    }

    logger.info('='.repeat(60));
    logger.info('All buttons on page:');
    logger.info('='.repeat(60) + '\n');

    for (let i = 0; i < Math.min(15, allButtons.length); i++) {
      const text = await allButtons[i].textContent().catch(() => 'N/A');
      const visible = await allButtons[i].isVisible().catch(() => false);
      const type = await allButtons[i].getAttribute('type').catch(() => 'button');
      logger.info(`[${i}] "${text}" (type=${type}, visible=${visible})`);
    }

    logger.info('\nTaking screenshot...');
    await page.screenshot({ path: './debug-submit-button-screenshot.png' });
    logger.info('✓ Saved\n');

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
