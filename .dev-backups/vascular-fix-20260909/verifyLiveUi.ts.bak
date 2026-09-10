import { Page } from 'playwright';
import { logger } from '../utils/logger';
import { waitForStable } from '../utils/waitStable';
import { scanAllFrames } from '../utils/domScan';
import { formUrl } from '../utils/env';
import { settle } from '../utils/browser';
import { LeafRecord, toDomFieldText, toDomCompetencyText, findNodeById } from './model';
import { fetchDynamicProperties, DynamicFieldDef } from './api';
import { saveCheckpoint } from '../utils/checkpoint';
import { DiscoverCheckpoint } from './discover';

function expectedSetsFor(fields: DynamicFieldDef[], competencyGroup: { particulars: string }[]): Set<string> {
  const fieldNames = fields.filter((f) => f.column_value_type !== 'radio').map((f) => toDomFieldText(f.column_name));
  const competencyNames = competencyGroup.map((c) => toDomCompetencyText(c.particulars));
  return new Set([...fieldNames, ...competencyNames]);
}

export async function selectFormOption(page: Page, label: string) {
  await page.goto(formUrl(), { waitUntil: 'domcontentloaded' });
  await settle(page, 600);
  await waitForStable(page, () =>
    page.evaluate(() => (document.querySelector('select[name="form"]') as HTMLSelectElement | null)?.options.length ?? 0)
  );
  await page.selectOption('select[name="form"]', { label });
  await page.waitForTimeout(900);
}

export async function selectReactSelectOption(page: Page, optionText: string): Promise<{ ok: boolean; availableOptions: string[] }> {
  const combo = page.locator('input[role="combobox"]').first();
  await combo.click();
  await page.waitForTimeout(400);
  const available = await page.locator('[id*="react-select"][id*="-option-"]').allTextContents();
  const target = page.locator('[id*="react-select"][id*="-option-"]', { hasText: optionText }).first();
  const count = await target.count();
  if (count === 0) {
    await page.keyboard.press('Escape').catch(() => {});
    return { ok: false, availableOptions: available };
  }
  await target.click();
  await page.waitForTimeout(900);
  return { ok: true, availableOptions: available };
}

export async function selectSkillType(page: Page, optionText: string): Promise<{ ok: boolean; availableOptions: string[] }> {
  const present = await page.waitForSelector('select[name="skillType2"]', { timeout: 6000 }).then(() => true).catch(() => false);
  if (!present) return { ok: false, availableOptions: [] };
  const available = await page.evaluate(() =>
    Array.from((document.querySelector('select[name="skillType2"]') as HTMLSelectElement).options)
      .filter((o) => o.value !== '')
      .map((o) => o.text.trim())
  );
  if (!available.includes(optionText)) return { ok: false, availableOptions: available };
  await page.selectOption('select[name="skillType2"]', { label: optionText });
  await page.waitForTimeout(1200);
  return { ok: true, availableOptions: available };
}

function setEq(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/**
 * The dynamic fields + competency checklist render asynchronously after the
 * cascading dropdowns settle, and larger checklists take visibly longer
 * (observed: leaves with 4-5 competency items were still mid-render at a
 * fixed 1200ms wait, producing false-positive mismatches against a stale
 * DOM). Poll the visible field-name set until it stops changing instead of
 * trusting a fixed delay.
 */
async function waitForFieldsToSettle(page: Page): Promise<void> {
  await waitForStable(
    page,
    () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('input, select, textarea'))
          .filter((el) => {
            const rect = (el as HTMLElement).getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .map((el) => el.getAttribute('name'))
          .filter(Boolean)
          .sort()
      ),
    { timeoutMs: 8000, quietMs: 700, intervalMs: 250 }
  );
}

/**
 * Replays each discovered leaf path through the real browser UI (fresh page
 * load each time, per the mapping-safety "clean reload between branches"
 * rule) and compares the fields/competency checkboxes that actually render
 * against what the get-form-list / dynamic-form-property APIs predicted.
 * This is the live cross-check that the API-derived model is not just
 * theoretical - it is what a real user's browser produces.
 */
export async function runLiveUiVerification(page: Page, cp: DiscoverCheckpoint, checkpointName = 'discover'): Promise<void> {
  for (let i = 0; i < cp.leaves.length; i++) {
    const leaf = cp.leaves[i];
    if (leaf.uiVerified !== undefined) continue; // resume: already verified (true or false)

    try {
      const [formLabel, caseTypeLabel, skillTypeLabel] = leaf.pathLabels;
      await selectFormOption(page, formLabel);

      const caseTypeResult = await selectReactSelectOption(page, caseTypeLabel);
      if (!caseTypeResult.ok) {
        leaf.uiVerified = false;
        leaf.uiVerifyError = `Case Type option "${caseTypeLabel}" not found in live dropdown. Available: ${caseTypeResult.availableOptions.join(', ')}`;
        logger.error(`[${i + 1}/${cp.leaves.length}] ${leaf.uiVerifyError}`);
        continue;
      }

      if (skillTypeLabel) {
        const skillResult = await selectSkillType(page, skillTypeLabel);
        if (!skillResult.ok) {
          leaf.uiVerified = false;
          leaf.uiVerifyError = `Skill Type option "${skillTypeLabel}" not found in live select. Available: ${skillResult.availableOptions.join(', ')}`;
          logger.error(`[${i + 1}/${cp.leaves.length}] ${leaf.uiVerifyError}`);
          continue;
        }
      }
      await waitForFieldsToSettle(page);

      // Read the id the live page is actually using for this combination
      // (from the hidden Case Type input, or the Skill Type select's own
      // value once selected). get-form-list has been observed to return a
      // different id for the *same label* between the initial bulk crawl
      // and what a live page session ends up using for a small number of
      // combinations (confirmed live for "Vascular Surgery > Interpretative
      // Skill" - two distinct backend records apparently share one label).
      // Trust whatever id the live page is actually using, not the cached
      // bulk-crawl id, and refetch its schema fresh when they differ.
      const liveId = skillTypeLabel
        ? await page.evaluate(() => (document.querySelector('select[name="skillType2"]') as HTMLSelectElement | null)?.value ?? null)
        : await page.evaluate(() => (document.querySelector('input[name="skillType1"]') as HTMLInputElement | null)?.value ?? null);

      const scan = await scanAllFrames(page);
      const visibleFieldNames = new Set(
        scan[0].elements
          .filter((e) => ['input', 'select', 'textarea'].includes(e.tag) && e.visible && e.name && !['form', 'skillType2'].includes(e.name))
          .map((e) => e.name as string)
      );

      let expectedAll = expectedSetsFor(leaf.fields ?? [], leaf.competencyGroup ?? []);
      let usedDriftFallback = false;

      if (liveId && liveId !== leaf.leafId && !setEq(visibleFieldNames, expectedAll)) {
        logger.info(`  id drift detected: cached id=${leaf.leafId}, live id=${liveId}. Refetching schema for the live id...`);
        const liveFields = await fetchDynamicProperties(page, liveId);
        const liveNode = findNodeById(cp.tree, liveId);
        if (liveFields) {
          expectedAll = expectedSetsFor(liveFields, liveNode?.competency_group ?? []);
          usedDriftFallback = true;
          leaf.idDrift = { cachedId: leaf.leafId, liveId, cachedFieldCount: (leaf.fields ?? []).length, liveFieldCount: liveFields.length };
        }
      }

      if (setEq(visibleFieldNames, expectedAll)) {
        leaf.uiVerified = true;
        const driftNote = usedDriftFallback ? ' [id drift resolved via live refetch]' : '';
        logger.info(`[${i + 1}/${cp.leaves.length}] VERIFIED: "${leaf.pathLabels.join(' > ')}" (${expectedAll.size} field(s) match live DOM)${driftNote}`);
      } else {
        const missing = [...expectedAll].filter((x) => !visibleFieldNames.has(x));
        const extra = [...visibleFieldNames].filter((x) => !expectedAll.has(x));
        leaf.uiVerified = false;
        leaf.uiVerifyError = `Field mismatch. Missing from DOM: [${missing.join(', ')}]. Unexpected in DOM: [${extra.join(', ')}]${
          liveId && liveId !== leaf.leafId ? ` (id drift: cached=${leaf.leafId}, live=${liveId})` : ''
        }`;
        logger.error(`[${i + 1}/${cp.leaves.length}] MISMATCH: "${leaf.pathLabels.join(' > ')}" - ${leaf.uiVerifyError}`);
      }
    } catch (err: any) {
      leaf.uiVerified = false;
      leaf.uiVerifyError = `Exception during live verification: ${err?.message ?? err}`;
      logger.error(`[${i + 1}/${cp.leaves.length}] EXCEPTION for "${leaf.pathLabels.join(' > ')}": ${err?.message ?? err}`);
    }

    if ((i + 1) % 5 === 0 || i === cp.leaves.length - 1) {
      saveCheckpoint(checkpointName, cp);
    }
  }
}
