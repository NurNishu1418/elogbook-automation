/**
 * READ-ONLY diagnostic: how are nested "Level" checkboxes associated with
 * their parent Procedural competency checkbox in the live DOM? Uses Basic
 * Surgical Skill > Procedural skill > "Handling a Procedural specimen"
 * (allowed levels 3,4 per the source config) as a clean, already-proven
 * combination, to avoid confounding with the separate Vascular Surgery
 * case-type investigation. NEVER clicks Save as Draft.
 */
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
    logger.info('Login confirmed (read-only diagnostic, no Save as Draft will be clicked).');

    await page.goto(formUrl(), { waitUntil: 'domcontentloaded' });
    await selectFormOption(page, 'Procedural and Interpretative Skills');
    const caseTypeResult = await selectReactSelectOption(page, 'Basic Surgical Skill');
    logger.info(`Case Type ok=${caseTypeResult.ok}`);
    const skillResult = await selectSkillType(page, 'Procedural skill');
    logger.info(`Skill Type ok=${skillResult.ok}`);
    await page.waitForTimeout(2000);

    // Snapshot BEFORE checking the competency item.
    const before = await page.evaluate(() => {
      const boxes = Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
      return boxes.map((b) => ({
        name: b.getAttribute('name'),
        id: b.id,
        checked: b.checked,
        visible: b.getBoundingClientRect().width > 0,
        outerHTMLSnippet: b.outerHTML.slice(0, 200),
        parentSnippet: b.parentElement?.outerHTML?.slice(0, 300) ?? null,
      }));
    });
    logger.info(`BEFORE checking item - total checkboxes in DOM: ${before.length}`);
    logger.info(JSON.stringify(before, null, 2));

    // Now check the target competency item.
    const targetName = 'Handling a Procedural specimen';
    const checkbox = page.locator(`input[type="checkbox"][name="${targetName}"]`).first();
    await checkbox.waitFor({ state: 'visible', timeout: 8000 });
    await checkbox.check();
    await page.waitForTimeout(1000);

    const after = await page.evaluate(() => {
      const boxes = Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
      return boxes.map((b) => ({
        name: b.getAttribute('name'),
        id: b.id,
        checked: b.checked,
        value: b.value,
        visible: b.getBoundingClientRect().width > 0,
        classList: b.className,
        outerHTMLSnippet: b.outerHTML.slice(0, 300),
        // capture ancestor chain up to 4 levels for structural context
        ancestorChain: (() => {
          let el: HTMLElement | null = b.parentElement;
          const chain: string[] = [];
          for (let i = 0; i < 4 && el; i++) {
            chain.push(`<${el.tagName.toLowerCase()} class="${el.className}">`);
            el = el.parentElement;
          }
          return chain;
        })(),
      }));
    });
    logger.info(`\nAFTER checking "${targetName}" - total checkboxes in DOM: ${after.length}`);
    logger.info(JSON.stringify(after, null, 2));

    // Also dump the raw HTML around the checked item's container for full structural context.
    const containerHtml = await page.evaluate((name) => {
      const box = document.querySelector(`input[type="checkbox"][name="${name}"]`) as HTMLElement | null;
      if (!box) return null;
      // Walk up to find a reasonably-sized container (e.g. the row/card for this competency item)
      let el: HTMLElement | null = box;
      for (let i = 0; i < 5 && el; i++) {
        el = el.parentElement;
      }
      return el?.outerHTML ?? null;
    }, targetName);
    logger.info(`\nContainer HTML around "${targetName}" (5 levels up):\n${containerHtml}`);

    logger.info('\n=== Diagnostic complete. No Save as Draft was clicked at any point. Checkbox left checked - reload the page or navigate away to discard. ===');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`diagnose-competency-level-dom crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
