/** READ-ONLY: does a 5th level checkbox exist for "Open and laparoscopic repair of inguinal hernia" (Abdominal Wall)? */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { logger } from '../utils/logger';
import { formUrl } from '../utils/env';
import { selectFormOption, selectReactSelectOption, selectSkillType } from './verifyLiveUi';

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
    await page.goto(formUrl(), { waitUntil: 'domcontentloaded' });
    await selectFormOption(page, 'Procedural and Interpretative Skills');
    await selectReactSelectOption(page, 'Abdominal Wall');
    await selectSkillType(page, 'Procedural skill');
    await page.waitForTimeout(1500);

    const target = 'Open and laparoscopic repair of inguinal hernia';
    const box = page.locator(`input[type="checkbox"][name="${target}"]`).first();
    await box.check();
    await page.waitForTimeout(800);

    const allCheckboxesAfter = await page.evaluate(() => {
      const boxes = Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
      return boxes.map((b) => ({ name: b.getAttribute('name'), visible: b.getBoundingClientRect().width > 0 }));
    });
    logger.info(`All checkboxes present after checking "${target}": ${JSON.stringify(allCheckboxesAfter, null, 2)}`);

    // Dump the raw container HTML around this item for full structural context.
    const containerHtml = await page.evaluate((name) => {
      const el = document.querySelector(`input[type="checkbox"][name="${name}"]`) as HTMLElement | null;
      if (!el) return null;
      let p: HTMLElement | null = el;
      for (let i = 0; i < 3 && p; i++) p = p.parentElement;
      return p?.outerHTML ?? null;
    }, target);
    logger.info(`Container HTML: ${containerHtml}`);

    await box.uncheck().catch(() => {});
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`check-level5-inguinal-hernia crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
