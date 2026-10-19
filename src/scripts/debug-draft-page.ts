import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';
import path from 'path';

const DRAFT_LIST_URL = process.env.DRAFT_LIST_URL
  || 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1791186751447';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  try {
    const loginResult = await login(page);
    if (!loginResult.success) throw new Error('Login failed');
    logger.info('Login OK');

    await page.goto(DRAFT_LIST_URL, { waitUntil: 'domcontentloaded' });
    await delay(3000);

    // Screenshot before filter
    await page.screenshot({ path: 'screenshots/draft-page-before-filter.png', fullPage: true });
    logger.info('Screenshot saved: before filter');

    // Try to find all selects on page
    const selects = await page.locator('select').all();
    for (let i = 0; i < selects.length; i++) {
      const name = await selects[i].getAttribute('name').catch(() => '?');
      const id = await selects[i].getAttribute('id').catch(() => '?');
      const options = await selects[i].locator('option').allTextContents();
      logger.info(`Select[${i}] name="${name}" id="${id}" options=[${options.join(', ')}]`);
    }

    // Try filtering by Draft
    const statusByName = page.locator('select[name*="status" i]').first();
    if (await statusByName.isVisible().catch(() => false)) {
      await statusByName.selectOption({ label: 'Draft' });
      logger.info('Selected Draft in status filter');
      const searchBtn = page.locator('button:has-text("Search"), button:has-text("Filter"), button[type="submit"]').first();
      if (await searchBtn.isVisible().catch(() => false)) {
        await searchBtn.click();
        await delay(3000);
        logger.info('Clicked search button');
      }
    } else {
      logger.info('No status select found by name, trying others...');
      // Try react-select or custom dropdown
      const allText = await page.locator('body').innerText();
      logger.info(`Page text snippet (first 2000 chars):\n${allText.substring(0, 2000)}`);
    }

    await page.screenshot({ path: 'screenshots/draft-page-after-filter.png', fullPage: true });
    logger.info('Screenshot saved: after filter');

    // Find ALL links on the page
    const allLinks = await page.locator('a').all();
    logger.info(`Total <a> links on page: ${allLinks.length}`);
    for (let i = 0; i < Math.min(allLinks.length, 40); i++) {
      const href = await allLinks[i].getAttribute('href').catch(() => '?');
      const text = await allLinks[i].textContent().catch(() => '?');
      if (href && (href.includes('logbook') || href.includes('entry'))) {
        logger.info(`  Link[${i}]: href="${href}" text="${text?.trim().substring(0, 80)}"`);
      }
    }

    // Find all buttons
    const allBtns = await page.locator('button').all();
    for (let i = 0; i < allBtns.length; i++) {
      const text = await allBtns[i].textContent().catch(() => '?');
      logger.info(`  Button[${i}]: "${text?.trim().substring(0, 60)}"`);
    }

  } catch (error: any) {
    logger.error(`Error: ${error?.stack ?? error}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(err => { logger.error(err); process.exit(1); });
