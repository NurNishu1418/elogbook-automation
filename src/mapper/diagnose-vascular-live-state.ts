/**
 * READ-ONLY diagnostic for the Vascular Surgery live-upload failures
 * (fillAndSaveDraft success=true but post-save verification fails for
 * Interpretative Skill; checkbox waitFor timeouts for Procedural skill).
 *
 * This script NEVER clicks "Save as Draft" and NEVER submits anything. It
 * only: logs in, navigates the Add Logbook Entry form to Vascular Surgery >
 * Interpretative Skill and > Procedural skill, reads the live-resolved
 * leaf id from the DOM, compares it to the cached id from
 * output/form-map.json, and lists the rendered competency checkbox names.
 */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { logger } from '../utils/logger';
import { formUrl } from '../utils/env';
import { selectFormOption, selectReactSelectOption, selectSkillType } from './verifyLiveUi';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

async function main() {
  const formMap = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'output', 'form-map.json'), 'utf-8'));
  const vascularLeaves = formMap.leaves.filter((l: any) => l.pathLabels?.[1] === 'Vascular Surgery');
  logger.info(`Cached Vascular leaves in form-map.json: ${vascularLeaves.map((l: any) => `${l.pathLabels.join(' > ')} = ${l.leafId}`).join(' | ')}`);

  // useStoredSession=false: force a completely fresh login/context with no
  // reused localStorage/cookies, to rule out stale client-side cached state
  // (e.g. a leftover "last viewed combination" from a previous session) as
  // the cause of the id/schema mismatch, before concluding it is a genuine
  // portal-side bug.
  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: false });
  const page = await context.newPage();

  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      return;
    }
    logger.info('Login confirmed (read-only diagnostic, no Save as Draft will be clicked).');

    for (const skillType of ['Interpretative Skill', 'Procedural skill']) {
      logger.info(`\n=== Diagnosing Vascular Surgery > ${skillType} ===`);
      const cachedLeaf = vascularLeaves.find((l: any) => l.pathLabels[2] === skillType);
      logger.info(`Cached leaf id: ${cachedLeaf?.leafId ?? '(not found in form-map.json)'}`);

      await page.goto(formUrl(), { waitUntil: 'domcontentloaded' });
      await selectFormOption(page, 'Procedural and Interpretative Skills');
      logger.info(`Visible URL after Form select: ${page.url()}`);

      const caseTypeResult = await selectReactSelectOption(page, 'Vascular Surgery');
      logger.info(`Case Type "Vascular Surgery" selectable: ${caseTypeResult.ok}. Available options: ${caseTypeResult.availableOptions.join(', ')}`);
      if (!caseTypeResult.ok) continue;

      const skillResult = await selectSkillType(page, skillType);
      logger.info(`Skill Type "${skillType}" selectable: ${skillResult.ok}. Available options: ${skillResult.availableOptions.join(', ')}`);
      if (!skillResult.ok) continue;

      // Sample the DOM at several checkpoints (checkbox rendering may be
      // asynchronous) rather than trusting a single fixed delay.
      const checkpointDelaysMs = [300, 900, 1300, 1500, 2000]; // cumulative: 300, 1200, 2500, 4000, 6000
      for (const delay of checkpointDelaysMs) {
        await page.waitForTimeout(delay);

        const liveLeafId = await page.evaluate(() => (document.querySelector('select[name="skillType2"]') as HTMLSelectElement | null)?.value ?? null);
        const checkboxData = await page.evaluate(() => {
          const boxes = Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
          return boxes.map((b) => ({ name: b.getAttribute('name'), visible: b.getBoundingClientRect().width > 0 }));
        });

        const visibleCaseType = await page.locator('input[role="combobox"]').first().evaluate((el) => {
          const container = el.closest('[class*="control"]') ?? el.parentElement?.parentElement;
          return container?.textContent?.trim() ?? null;
        }).catch(() => null);
        const visibleSkillTypeSelected = await page.evaluate(() => {
          const sel = document.querySelector('select[name="skillType2"]') as HTMLSelectElement | null;
          return sel ? sel.options[sel.selectedIndex]?.text ?? null : null;
        });

        logger.info(`--- checkpoint (+${delay}ms) ---`);
        logger.info(`Visible Case Type combobox text: "${visibleCaseType}"`);
        logger.info(`Visible Skill Type <option> selected text: "${visibleSkillTypeSelected}"`);
        logger.info(`Live-resolved leaf id (select[name="skillType2"].value): ${liveLeafId}`);
        logger.info(`ID DRIFT: ${liveLeafId && cachedLeaf && liveLeafId !== cachedLeaf.leafId ? 'YES - cached and live ids differ' : 'no drift detected'}`);
        logger.info(`Rendered checkbox count: ${checkboxData.length}`);
        logger.info(`Rendered checkbox names (verbatim): ${JSON.stringify(checkboxData.map((c) => c.name))}`);
      }

      if (cachedLeaf?.competencyGroup?.length) {
        logger.info(`Cached expected competency names: ${JSON.stringify(cachedLeaf.competencyGroup.map((c: any) => c.particulars))}`);
      }
      logger.info(`Current page URL: ${page.url()}`);
    }

    logger.info('\n=== Diagnostic complete. No Save as Draft was clicked at any point. ===');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`diagnose-vascular-live-state crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
