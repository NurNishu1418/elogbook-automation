/**
 * READ-ONLY diagnostic: does the UI's rendered row order at a given page
 * actually match the filtered API response's order at that same page?
 * This tests the assumption behind portalRowLocator.ts, which just failed
 * live (API said page 7 index 5 = entry X, but the opened modal showed a
 * different entry). Never clicks Edit.
 */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { authGet } from '../mapper/api';
import { logger } from '../utils/logger';
import { env } from '../utils/env';

const HEADING = 'Procedural and Interpretative Skills';

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

    // 1) Fetch page 7 via the exact filtered API URL.
    const apiUrl = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=7&paginate_per_page=10&heading=${encodeURIComponent(HEADING)}&approved_status=Draft`;
    const r = await authGet<{ success: boolean; data: { data: any[] } }>(page, apiUrl);
    const apiRows = r.body.data.data.map((e: any) => {
      let details: any = {};
      try {
        details = JSON.parse(e.details_json);
      } catch {}
      const checked = (e.competency_group ?? []).filter((c: any) => c.status).map((c: any) => c.skill_name);
      return { id: e.id, caseType: details.caseType, skillType: details.skillType, checkedSkills: checked };
    });
    logger.info(`API page 7 rows:\n${JSON.stringify(apiRows, null, 2)}`);

    // 2) Render the UI to page 7 the same way repairOneEntry does, and
    // read each row's visible Case Type + Skill Type columns (NOT
    // opening any modal - just reading rendered text).
    await page.goto(`${env.baseUrl}/trainee/logbook-entry`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.locator('select').first().selectOption({ label: HEADING });
    await page.waitForTimeout(300);
    await page.locator('select').nth(1).selectOption({ label: 'Draft' });
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Search")').first().click();
    await page.locator('.rdt_TableRow').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.waitForTimeout(500);

    for (let i = 1; i < 7; i++) {
      const nextButton = page.locator('[aria-label="Next Page"]').first();
      await nextButton.click();
      await page.locator('.rdt_TableRow').first().waitFor({ state: 'visible', timeout: 8000 });
      await page.waitForTimeout(500);
    }

    const uiRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.rdt_TableRow'));
      return rows.map((r) => r.textContent?.replace(/\s+/g, ' ').trim());
    });
    logger.info(`\nUI page 7 rows (rendered text):\n${JSON.stringify(uiRows, null, 2)}`);

    // 3) Also re-fetch the API page 7 AGAIN right now, immediately after
    // the UI navigation, to see if the API's own order changed between
    // the two calls (race condition check).
    const r2 = await authGet<{ success: boolean; data: { data: any[] } }>(page, apiUrl);
    const apiRows2 = r2.body.data.data.map((e: any) => e.id);
    logger.info(`\nAPI page 7 ids (2nd call, right after UI navigation): ${JSON.stringify(apiRows2)}`);
    logger.info(`API page 7 ids (1st call): ${JSON.stringify(apiRows.map((r: any) => r.id))}`);
    logger.info(`Same order both calls: ${JSON.stringify(apiRows.map((r: any) => r.id)) === JSON.stringify(apiRows2)}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`diagnose-position-mismatch crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
