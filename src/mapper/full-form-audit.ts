/**
 * FULL READ-ONLY AUDIT of all 43 mapped leaf combinations. For each leaf:
 * navigates fresh, selects Form/CaseType/SkillType, waits for the dynamic
 * form to render, enumerates every visible field via the existing
 * scanAllFrames() scanner, enumerates every competency checkbox and (for
 * Procedural-style leaves) checks each one momentarily to reveal and
 * record its nested Level checkboxes, then unchecks it again. NEVER
 * clicks Save as Draft or Submit anywhere. Cross-checks the live-resolved
 * leaf id against the cached output/form-map.json id and flags drift.
 *
 * Output: audit/full-form-audit-20260910/raw-leaf-audit.json (one entry
 * per leaf, full detail) - post-processed separately into the narrative
 * report sections.
 */
import fs from 'fs';
import path from 'path';
import { Page } from 'playwright';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { logger } from '../utils/logger';
import { formUrl, env } from '../utils/env';
import { scanAllFrames } from '../utils/domScan';
import { selectFormOption, selectReactSelectOption, selectSkillType } from './verifyLiveUi';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const AUDIT_DIR = path.join(PROJECT_ROOT, 'audit', 'full-form-audit-20260910');
const OUTPUT_PATH = path.join(AUDIT_DIR, 'raw-leaf-audit.json');

interface CachedLeaf {
  leafId: string;
  pathLabels: string[];
  fields?: any[];
  competencyGroup?: any[];
}

interface LeafAuditResult {
  index: number;
  pathLabels: string[];
  cachedLeafId: string;
  liveLeafId: string | null;
  idDrift: boolean;
  visibleCaseTypeAfterSelect: string | null;
  caseTypeSelectOk: boolean;
  skillTypeSelectOk: boolean | null;
  liveFields: { name: string | null; tag: string; type: string | null; label: string | null; required: boolean; visible: boolean; options: any }[];
  liveCompetencyCheckboxes: { name: string | null; visible: boolean }[];
  competencyLevelInspection: { skillName: string; levelsRenderedAfterCheck: string[]; matchesCachedValidLevels: string[] | 'no-cached-data' }[];
  cachedFieldCount: number;
  cachedCompetencyCount: number;
  liveFieldCount: number;
  liveCompetencyCount: number;
  notes: string[];
  error: string | null;
}

function loadCheckpoint(): LeafAuditResult[] {
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

function saveCheckpoint(results: LeafAuditResult[]) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf-8');
}

async function readLiveLeafId(page: Page, hasSkillType: boolean): Promise<string | null> {
  return hasSkillType
    ? page.evaluate(() => (document.querySelector('select[name="skillType2"]') as HTMLSelectElement | null)?.value ?? null)
    : page.evaluate(() => (document.querySelector('input[name="skillType1"]') as HTMLInputElement | null)?.value ?? null);
}

async function auditOneLeaf(page: Page, cachedLeaf: CachedLeaf, index: number): Promise<LeafAuditResult> {
  const [formLabel, caseTypeLabel, skillTypeLabel] = cachedLeaf.pathLabels;
  const notes: string[] = [];
  const result: LeafAuditResult = {
    index,
    pathLabels: cachedLeaf.pathLabels,
    cachedLeafId: cachedLeaf.leafId,
    liveLeafId: null,
    idDrift: false,
    visibleCaseTypeAfterSelect: null,
    caseTypeSelectOk: false,
    skillTypeSelectOk: skillTypeLabel ? false : null,
    liveFields: [],
    liveCompetencyCheckboxes: [],
    competencyLevelInspection: [],
    cachedFieldCount: (cachedLeaf.fields ?? []).length,
    cachedCompetencyCount: (cachedLeaf.competencyGroup ?? []).length,
    liveFieldCount: 0,
    liveCompetencyCount: 0,
    notes,
    error: null,
  };

  try {
    await selectFormOption(page, formLabel);

    const caseTypeResult = await selectReactSelectOption(page, caseTypeLabel);
    result.caseTypeSelectOk = caseTypeResult.ok;
    if (!caseTypeResult.ok) {
      result.error = `Case Type "${caseTypeLabel}" not selectable live. Available: ${caseTypeResult.availableOptions.join(', ')}`;
      return result;
    }

    // Verify the VISIBLE Case Type label actually reflects what we asked
    // for (the confirmed Vascular Surgery portal bug: the click can
    // "succeed" per selectReactSelectOption's own check yet the live
    // combobox silently displays a DIFFERENT case type).
    const visibleCaseType = await page
      .locator('input[role="combobox"]')
      .first()
      .evaluate((el: HTMLElement) => {
        const container = el.closest('[class*="control"]') ?? el.parentElement?.parentElement;
        return container?.textContent?.trim() ?? null;
      })
      .catch(() => null);
    result.visibleCaseTypeAfterSelect = visibleCaseType;
    if (!visibleCaseType || !visibleCaseType.includes(caseTypeLabel.trim())) {
      notes.push(`CASE TYPE MISMATCH: requested "${caseTypeLabel}" but the combobox visibly shows "${visibleCaseType}" after selection.`);
    }

    if (skillTypeLabel) {
      const skillResult = await selectSkillType(page, skillTypeLabel);
      result.skillTypeSelectOk = skillResult.ok;
      if (!skillResult.ok) {
        result.error = `Skill Type "${skillTypeLabel}" not selectable live. Available: ${skillResult.availableOptions.join(', ')}`;
        return result;
      }
    }

    await page.waitForTimeout(2000);

    const liveId = await readLiveLeafId(page, !!skillTypeLabel);
    result.liveLeafId = liveId;
    result.idDrift = !!(liveId && liveId !== cachedLeaf.leafId);
    if (result.idDrift) notes.push(`ID DRIFT: cached=${cachedLeaf.leafId}, live=${liveId}.`);

    const scan = await scanAllFrames(page);
    const els = scan[0]?.elements ?? [];
    const relevantNames = new Set(['form', 'skillType2', 'skillType1']);
    const visibleFields = els.filter((e) => ['input', 'select', 'textarea'].includes(e.tag) && e.visible && e.type !== 'checkbox' && !relevantNames.has(e.name ?? ''));
    result.liveFields = visibleFields.map((e) => ({ name: e.name, tag: e.tag, type: e.type, label: e.labelText, required: e.required, visible: e.visible, options: e.options }));
    result.liveFieldCount = visibleFields.length;

    const checkboxes = els.filter((e) => e.tag === 'input' && e.type === 'checkbox' && e.name !== 'Competency Group and Details' && !['levelOne', 'levelTwo', 'levelThree', 'levelFour'].includes(e.name ?? ''));
    result.liveCompetencyCheckboxes = checkboxes.map((e) => ({ name: e.name, visible: e.visible }));
    result.liveCompetencyCount = checkboxes.length;

    // For Procedural-style leaves (checkboxes present), sample-check EVERY
    // competency item momentarily to reveal its nested Level checkboxes,
    // record which levels render, then uncheck again (never saved).
    if (checkboxes.length > 0) {
      for (const cb of checkboxes) {
        if (!cb.name) continue;
        try {
          const box = page.locator(`input[type="checkbox"][name="${cb.name.replace(/"/g, '\\"')}"]`).first();
          await box.check();
          await page.waitForTimeout(400);
          const levelsRendered = await page.evaluate(() => {
            const names = ['levelOne', 'levelTwo', 'levelThree', 'levelFour'];
            return names.filter((n) => {
              const el = document.querySelector(`input[name="${n}"]`) as HTMLElement | null;
              return el && el.getBoundingClientRect().width > 0;
            });
          });
          const cachedItem = (cachedLeaf.competencyGroup ?? []).find((c: any) => c.particulars.trim() === cb.name!.trim());
          const cachedValidLevels = cachedItem ? (cachedItem.log_entry_target ?? []).map((t: any) => t.compitency_level).filter(Boolean) : 'no-cached-data';
          result.competencyLevelInspection.push({ skillName: cb.name, levelsRenderedAfterCheck: levelsRendered, matchesCachedValidLevels: cachedValidLevels });
          await box.uncheck().catch(() => {});
          await page.waitForTimeout(150);
        } catch (err: any) {
          notes.push(`Failed to inspect levels for "${cb.name}": ${err?.message ?? err}`);
        }
      }
    }
  } catch (err: any) {
    result.error = `Exception: ${err?.message ?? err}`;
  }

  return result;
}

async function main() {
  const formMap = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'output', 'form-map.json'), 'utf-8'));
  const leaves: CachedLeaf[] = formMap.leaves;
  logger.info(`Total leaves to audit: ${leaves.length}`);

  const results = loadCheckpoint();
  const doneIds = new Set(results.map((r) => r.cachedLeafId));

  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      process.exit(2);
    }
    logger.info('Login confirmed. READ-ONLY audit - no Save as Draft or Submit will ever be clicked.');

    for (let i = 0; i < leaves.length; i++) {
      const leaf = leaves[i];
      if (doneIds.has(leaf.leafId)) {
        logger.info(`[${i + 1}/${leaves.length}] SKIP (already audited): ${leaf.pathLabels.join(' > ')}`);
        continue;
      }
      logger.info(`[${i + 1}/${leaves.length}] Auditing: ${leaf.pathLabels.join(' > ')}`);
      const result = await auditOneLeaf(page, leaf, i + 1);
      results.push(result);
      saveCheckpoint(results);
      logger.info(
        `  -> fields=${result.liveFieldCount} (cached ${result.cachedFieldCount}), competencyItems=${result.liveCompetencyCount} (cached ${result.cachedCompetencyCount}), idDrift=${result.idDrift}, caseTypeMismatch=${result.notes.some((n) => n.includes('MISMATCH'))}, error=${result.error ?? 'none'}`
      );
    }
  } finally {
    await browser.close();
  }

  logger.info(`\n=== Audit complete. ${results.length}/${leaves.length} leaves recorded to ${OUTPUT_PATH} ===`);
}

main().catch((err) => {
  logger.error(`full-form-audit crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
