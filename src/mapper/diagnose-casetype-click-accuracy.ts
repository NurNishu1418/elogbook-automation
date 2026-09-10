/**
 * READ-ONLY diagnostic: does selectReactSelectOption() actually land on the
 * Case Type it was asked to select? Tests several positions in the
 * dropdown list (first, middle, near-end, last) to see whether a
 * click-targeting/scroll issue is specific to items near the end of the
 * list (as the Vascular Surgery diagnostic suggests) or something else.
 * NEVER clicks Save as Draft.
 */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { logger } from '../utils/logger';
import { formUrl } from '../utils/env';
import { selectFormOption, selectReactSelectOption } from './verifyLiveUi';

async function readVisibleCaseType(page: any): Promise<string | null> {
  return page
    .locator('input[role="combobox"]')
    .first()
    .evaluate((el: HTMLElement) => {
      const container = el.closest('[class*="control"]') ?? el.parentElement?.parentElement;
      return container?.textContent?.trim() ?? null;
    })
    .catch(() => null);
}

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
    logger.info('Login confirmed (read-only diagnostic, no Save as Draft will be clicked).');

    // Positions in the known 18-item list: Abdominal Wall(1,first),
    // Neurosurgery(9,middle), Surgical Oncology(15), Thoracic and
    // Cardiovascular Surgery(16), Urology(17), Vascular Surgery(18,last)
    const targets = ['Abdominal Wall', 'Neurosurgery', 'Surgical Oncology', 'Thoracic and Cardiovascular Surgery', 'Urology', 'Vascular Surgery'];

    for (const target of targets) {
      await page.goto(formUrl(), { waitUntil: 'domcontentloaded' });
      await selectFormOption(page, 'Procedural and Interpretative Skills');
      const result = await selectReactSelectOption(page, target);
      await page.waitForTimeout(500);
      const visible = await readVisibleCaseType(page);
      const matches = visible?.includes(target);
      logger.info(`Requested: "${target}" | ok=${result.ok} | Visible after click: "${visible}" | MATCH=${matches}`);
    }

    logger.info('\n=== Diagnostic complete. No Save as Draft was clicked at any point. ===');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`diagnose-casetype-click-accuracy crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
