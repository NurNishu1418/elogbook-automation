/** READ-ONLY: find the real "next page" control and confirm it actually advances the list. */
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
    await page.goto(`${env.baseUrl}/trainee/logbook-entry`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.locator('select').first().selectOption({ label: 'Procedural and Interpretative Skills' });
    await page.waitForTimeout(300);
    await page.locator('select').nth(1).selectOption({ label: 'Draft' });
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Search")').first().click();
    await page.waitForTimeout(1500);

    // Find candidate "next page" controls near the pagination footer text.
    const candidates = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
      return buttons
        .map((b) => ({
          text: (b.textContent || '').trim(),
          ariaLabel: b.getAttribute('aria-label'),
          title: b.getAttribute('title'),
          disabled: (b as HTMLButtonElement).disabled,
          classList: b.className?.toString?.() ?? '',
        }))
        .filter((b) => /next|arrow|chevron|page/i.test(b.ariaLabel ?? '') || /next|arrow|chevron|page/i.test(b.title ?? '') || /next|pagination/i.test(b.classList));
    });
    logger.info(`Candidate pagination buttons: ${JSON.stringify(candidates, null, 2)}`);

    const beforeText = await page.locator('body').innerText();
    const beforeDates = beforeText.match(/\d{2}\/[A-Za-z]{3}\/\d{4}/g) ?? [];
    logger.info(`Page 1 first 3 dates: ${JSON.stringify(beforeDates.slice(0, 3))}`);

    // Try the most likely MUI-standard selector.
    const nextBtn = page.locator('button[aria-label="Go to next page"], button[title="Next Page"], [aria-label*="next" i]').first();
    const nextBtnCount = await nextBtn.count();
    logger.info(`"Go to next page"-style button count: ${nextBtnCount}`);
    if (nextBtnCount > 0) {
      await nextBtn.click();
      await page.waitForTimeout(1500);
      const afterText = await page.locator('body').innerText();
      const afterDates = afterText.match(/\d{2}\/[A-Za-z]{3}\/\d{4}/g) ?? [];
      logger.info(`After clicking next-page candidate, first 3 dates: ${JSON.stringify(afterDates.slice(0, 3))}`);
      logger.info(`Page actually advanced: ${JSON.stringify(afterDates.slice(0, 3)) !== JSON.stringify(beforeDates.slice(0, 3))}`);
      const paginationFooter = afterText.split('Rows per page')[1]?.slice(0, 30);
      logger.info(`Pagination footer now: "${paginationFooter}"`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`diagnose-pagination-buttons crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
