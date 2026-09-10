/** READ-ONLY: why does the Basic Surgical Skill Draft list not surface a known entry by date? */
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

    const formSelect = page.locator('select').first();
    await formSelect.selectOption({ label: 'Procedural and Interpretative Skills' });
    await page.waitForTimeout(300);
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption({ label: 'Draft' });
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Search")').first().click();
    await page.waitForTimeout(1500);

    const bodyText1 = await page.locator('body').innerText();
    const dateMatches1 = bodyText1.match(/\d{2}\/[A-Za-z]{3}\/\d{4}/g) ?? [];
    logger.info(`Default page size - visible date count: ${dateMatches1.length}. Sample: ${JSON.stringify(dateMatches1.slice(0, 5))}`);
    logger.info(`"1-1" / "Rows per page" text present: ${bodyText1.includes('Rows per page')}`);
    // Print the pagination footer text specifically
    const paginationText = bodyText1.split('Rows per page')[1]?.slice(0, 100);
    logger.info(`Pagination footer text: "${paginationText}"`);

    // Try setting rows-per-page to 200 and clicking Search again
    const allSelects = page.locator('select');
    const selectCount = await allSelects.count();
    logger.info(`Total <select> elements on page: ${selectCount}`);
    for (let i = 0; i < selectCount; i++) {
      const opts = await allSelects.nth(i).locator('option').allTextContents();
      logger.info(`  select[${i}] options: ${JSON.stringify(opts)}`);
    }

    for (let i = 0; i < selectCount; i++) {
      const sel = allSelects.nth(i);
      const opts = await sel.locator('option').allTextContents();
      if (opts.map((o) => o.trim()).includes('200')) {
        await sel.selectOption({ label: '200' });
        logger.info(`Selected 200 on select[${i}]`);
        break;
      }
    }
    await page.waitForTimeout(1500);
    const bodyText2 = await page.locator('body').innerText();
    const dateMatches2 = bodyText2.match(/\d{2}\/[A-Za-z]{3}\/\d{4}/g) ?? [];
    logger.info(`After setting 200 (no re-search) - visible date count: ${dateMatches2.length}`);

    await page.locator('button:has-text("Search")').first().click();
    await page.waitForTimeout(1500);
    const bodyText3 = await page.locator('body').innerText();
    const dateMatches3 = bodyText3.match(/\d{2}\/[A-Za-z]{3}\/\d{4}/g) ?? [];
    logger.info(`After setting 200 AND re-clicking Search - visible date count: ${dateMatches3.length}`);
    logger.info(`Does it now include "19/Mar/2026"? ${bodyText3.includes('19/Mar/2026')}`);
    logger.info(`Does it now include "Basic Surgical Skill"? ${bodyText3.includes('Basic Surgical Skill')}`);
    const basicSurgicalCount = (bodyText3.match(/Basic Surgical Skill/g) ?? []).length;
    logger.info(`Count of "Basic Surgical Skill" occurrences: ${basicSurgicalCount}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`diagnose-list-pagination crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
