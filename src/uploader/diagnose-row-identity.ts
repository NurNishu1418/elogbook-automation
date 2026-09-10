/**
 * READ-ONLY diagnostic: what text is actually rendered in each row of the
 * trainee's Logbook Entry list, and can we build a match condition that is
 * PROVABLY unique per entry (never relying on .last() among several
 * same-date/same-caseType rows, which caused a false match earlier)?
 * Never clicks Edit. Never modifies anything.
 */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { logger } from '../utils/logger';
import { env } from '../utils/env';

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();
  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      return;
    }
    logger.info('Login confirmed (read-only).');

    const capturedRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('trainee-log-entry-list')) {
        capturedRequests.push(req.url());
      }
    });

    await page.goto(`${env.baseUrl}/trainee/logbook-entry`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const formSelect = page.locator('select').first();
    await formSelect.selectOption({ label: 'Procedural and Interpretative Skills' });
    await page.waitForTimeout(300);
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption({ label: 'Draft' });
    await page.waitForTimeout(300);
    const searchButton = page.locator('button:has-text("Search")').first();
    await searchButton.click();
    await page.locator('button:has-text("Edit")').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.waitForTimeout(800);

    // Dump the ancestor tag-chain of the first Edit button to find the
    // actual per-row element (rather than guessing a fixed depth).
    const ancestorChain = await page.evaluate(() => {
      const editButtons = Array.from(document.querySelectorAll('button')).filter((b) => b.textContent?.trim() === 'Edit');
      const btn = editButtons[0];
      if (!btn) return null;
      let el: HTMLElement | null = btn as unknown as HTMLElement;
      const chain: { tag: string; className: string; textLen: number }[] = [];
      for (let i = 0; i < 10 && el; i++) {
        chain.push({ tag: el.tagName, className: el.className, textLen: el.textContent?.length ?? 0 });
        el = el.parentElement;
      }
      return chain;
    });
    logger.info(`Ancestor chain of first Edit button:\n${JSON.stringify(ancestorChain, null, 2)}`);

    // Try tr first (most likely for a table row), else fall back to a
    // generic scan for the smallest ancestor whose text includes "Edit"
    // but is meaningfully smaller than the full table.
    const rdtRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.rdt_TableRow'));
      return rows.map((r) => r.textContent?.replace(/\s+/g, ' ').trim());
    });
    logger.info(`\n.rdt_TableRow count: ${rdtRows.length}`);
    logger.info(JSON.stringify(rdtRows, null, 2));

    logger.info(`\nCaptured trainee-log-entry-list requests triggered by Search:\n${JSON.stringify(capturedRequests, null, 2)}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`diagnose-row-identity crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
