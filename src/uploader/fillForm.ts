import fs from 'fs';
import path from 'path';
import { Page } from 'playwright';
import { logger } from '../utils/logger';
import { selectFormOption, selectReactSelectOption, selectSkillType } from '../mapper/verifyLiveUi';
import { DataEntryRow } from './excelReader';
import { LeafForValidation } from './validateRow';
import { skillTypeHasCompetencyLevel } from './competencyLevel';

export interface FillResult {
  success: boolean;
  draftReference: string | null;
  failedField: string | null;
  error: string | null;
}

function stripDots(s: string): string {
  return s.replace(/\./g, '').trim().replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------
// Procedural competency Level support.
//
// Root cause of the "Handling a Procedural specimen" style bug: every
// Procedural-skill competency item, once its main checkbox is checked,
// grows a nested set of 4 Level checkboxes in the DOM - but those 4
// checkboxes use FIXED, GLOBAL names ("levelOne".."levelFour"), not names
// scoped to the specific skill. The DOM renders all 4 for every skill
// regardless of which levels are actually valid for it; validity is
// determined purely by the mapped/source data (output/form-map.json's
// log_entry_target.compitency_level for that competency item), never
// enforced by the portal itself. The previous fillAndSaveDraft only ever
// checked the main skill checkbox and never touched levelOne..levelFour
// at all, so every Procedural-skill draft this pipeline ever created was
// saved with NO level selected.
//
// This lookup is loaded directly from the same output/form-map.json the
// rest of the uploader already trusts, keyed by leafId -> particulars ->
// sorted list of valid level strings ("1".."4"). Loaded lazily and cached
// so existing callers of fillAndSaveDraft need no signature change.
// ---------------------------------------------------------------------
type LevelLookup = Map<string, Map<string, string[]>>;
let cachedLevelLookup: LevelLookup | null = null;

export const LEVEL_CHECKBOX_NAME: Record<string, string> = {
  '1': 'levelOne',
  '2': 'levelTwo',
  '3': 'levelThree',
  '4': 'levelFour',
};

function loadLevelLookup(): LevelLookup {
  if (cachedLevelLookup) return cachedLevelLookup;
  const specialty = process.env.UPLOAD_SPECIALTY ?? null;
  const formMapPath = specialty
    ? path.resolve(__dirname, '..', '..', 'output', `form-map-${specialty.toLowerCase()}.json`)
    : path.resolve(__dirname, '..', '..', 'output', 'form-map.json');
  const lookup: LevelLookup = new Map();
  try {
    const formMap = JSON.parse(fs.readFileSync(formMapPath, 'utf-8'));
    for (const leaf of formMap.leaves ?? []) {
      const perItem = new Map<string, string[]>();
      for (const cg of leaf.competencyGroup ?? []) {
        const levels = (cg.log_entry_target ?? [])
          .map((t: { compitency_level: string | null }) => t.compitency_level)
          .filter((l: string | null): l is string => l !== null && l !== undefined && l !== '')
          .sort();
        // Keyed by the TRIMMED particulars: several portal competency
        // labels carry a trailing space in output/form-map.json (e.g.
        // "Arterial thrombo-embolectomy "), but other API surfaces (e.g.
        // trainee-log-entry-list's competency_group[].skill_name) report
        // the same item trimmed. Matches the existing project-wide
        // convention of comparing competency names via .trim() (see
        // fillForm.ts's own item-matching and verifyEntrySaved.ts's
        // compareEntryToRow) - the checkbox's DOM `name` attribute still
        // uses the untrimmed portal string verbatim elsewhere; this
        // lookup is solely for level resolution, not DOM selection.
        if (levels.length > 0) perItem.set(cg.particulars.trim(), levels);
      }
      if (perItem.size > 0) lookup.set(leaf.leafId, perItem);
    }
  } catch (err: any) {
    logger.error(`fillForm: could not load competency level lookup from ${formMapPath}: ${err?.message ?? err}`);
  }
  cachedLevelLookup = lookup;
  return lookup;
}

export interface LevelResolution {
  status: 'single-valid-level' | 'explicit-level-confirmed' | 'explicit-level-accepted-unmapped' | 'ambiguous-multiple-levels' | 'no-levels-mapped' | 'invalid-explicit-level' | 'unselectable-level';
  validLevels: string[];
  selectedLevel: string | null;
}

/**
 * Determines which single Level checkbox to select for a given competency
 * item, using ONLY the mapped/source data plus an optional explicit
 * per-row override (the workbook's "CompetencyLevel" ExtraFieldsJSON key)
 * - never inventing a value.
 * - Exactly one valid level mapped, no explicit override: unambiguous,
 *   select it (backward compatible with workbooks predating the
 *   CompetencyLevel key).
 * - An explicit level is provided and IS one of the item's valid levels:
 *   use it, whether the item has one or many valid levels.
 * - An explicit level is provided but is NOT one of the item's valid
 *   levels: fail - never silently fall back to auto-resolution.
 * - More than one valid level mapped and no explicit override: genuinely
 *   ambiguous - the caller must fail the row rather than guess.
 * - Zero valid levels mapped: this item apparently has no Level concept.
 * - The resolved level has no corresponding DOM checkbox (confirmed live
 *   for Abdominal Wall's "Open and laparoscopic repair of inguinal
 *   hernia", mapped level "5" - the portal only ever renders Level 1-4):
 *   'unselectable-level' (LEVEL5_PORTAL_UI_HOLD). Never substitute a
 *   different level, never invent a control.
 */
/** Pure decision rule, isolated from file I/O so it is trivially unit-testable. */
export function resolveLevelFromValidLevels(validLevels: string[], providedLevel?: string | null): LevelResolution {
  const explicit = providedLevel?.trim() || null;

  if (validLevels.length === 0) {
    if (explicit) {
      if (LEVEL_CHECKBOX_NAME[explicit]) return { status: 'explicit-level-accepted-unmapped', validLevels, selectedLevel: explicit };
      return { status: 'invalid-explicit-level', validLevels, selectedLevel: null };
    }
    return { status: 'no-levels-mapped', validLevels, selectedLevel: null };
  }

  if (explicit) {
    if (!validLevels.includes(explicit)) return { status: 'invalid-explicit-level', validLevels, selectedLevel: null };
    if (!LEVEL_CHECKBOX_NAME[explicit]) return { status: 'unselectable-level', validLevels, selectedLevel: explicit };
    return { status: 'explicit-level-confirmed', validLevels, selectedLevel: explicit };
  }

  if (validLevels.length === 1) {
    const only = validLevels[0];
    if (!LEVEL_CHECKBOX_NAME[only]) return { status: 'unselectable-level', validLevels, selectedLevel: only };
    return { status: 'single-valid-level', validLevels, selectedLevel: only };
  }

  return { status: 'ambiguous-multiple-levels', validLevels, selectedLevel: null };
}

export function resolveLevelForItem(leafId: string, itemParticulars: string, providedLevel?: string | null): LevelResolution {
  const lookup = loadLevelLookup();
  const validLevels = lookup.get(leafId)?.get(itemParticulars.trim()) ?? [];
  return resolveLevelFromValidLevels(validLevels, providedLevel);
}

/**
 * The mapped "column_value_type" from output/form-map.json can go stale -
 * a field the portal rendered as a custom dropdown when the mapper last ran
 * may since have been changed to a plain text/textarea input (confirmed live
 * for Patient Management > Emergency Patient Management's "Outcome" field,
 * mapped as "dropdown" but now a plain text input). Rather than trust the
 * mapping blindly, ask the live DOM what kind of control is actually
 * rendered right now and fill it accordingly - the mapping's controlType is
 * only consulted as a fallback for the one case a live tag/type genuinely
 * can't disambiguate (an unrecognized custom widget with no native
 * input/textarea/select semantics).
 */
async function fillOneField(page: Page, fieldName: string, controlType: string, value: string): Promise<void> {
  const selector = `[name="${fieldName.replace(/"/g, '\\"')}"]`;
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 8000 });

  const live = await el.evaluate((node) => ({
    tag: node.tagName,
    type: (node as HTMLInputElement).type ?? null,
  }));

  if (live.tag === 'SELECT') {
    await el.selectOption({ label: value });
    return;
  }
  if (live.tag === 'INPUT' && live.type === 'checkbox') {
    const shouldCheck = ['true', 'yes', '1'].includes(value.toLowerCase());
    if (shouldCheck) await el.check();
    else await el.uncheck();
    return;
  }
  if (live.tag === 'TEXTAREA' || (live.tag === 'INPUT' && live.type !== 'radio')) {
    // covers text, date, and any other plain native input - including a
    // field the mapping still calls "dropdown" but the live DOM renders as
    // a normal text input.
    await el.fill(value);
    return;
  }

  if (controlType === 'dropdown') {
    // Custom widget, exact behaviour not fully reverse-engineered (its
    // option list is not exposed by the dynamic-form-property API). Best
    // effort: click to open, then click a rendered option matching the
    // given text.
    await el.click();
    await page.waitForTimeout(400);
    const option = page.locator(`text="${value}"`).last();
    if ((await option.count()) === 0) {
      throw new Error(`Custom dropdown "${fieldName}": no option matching "${value}" found after opening it.`);
    }
    await option.click();
    return;
  }

  await el.fill(value);
}

/**
 * Fills the Add Logbook Entry form for one row and clicks "Save as Draft".
 * When `finalSubmit` is true (opt-in, UPLOAD_FINAL_SUBMIT=1) it clicks
 * "Submit" instead, which sends the entry to the supervisor. Assumes the
 * caller already navigated to a fresh form page and is logged in.
 */
export async function fillAndSaveDraft(page: Page, row: DataEntryRow, leaf: LeafForValidation, finalSubmit = false): Promise<FillResult> {
  try {
    await selectFormOption(page, row.form);

    const caseTypeResult = await selectReactSelectOption(page, row.caseType);
    if (!caseTypeResult.ok) {
      return { success: false, draftReference: null, failedField: 'CaseType', error: `Case Type "${row.caseType}" not found live. Available: ${caseTypeResult.availableOptions.join(', ')}` };
    }

    if (leaf.pathLabels[2]) {
      const skillResult = await selectSkillType(page, row.skillType);
      if (!skillResult.ok) {
        return { success: false, draftReference: null, failedField: 'SkillType', error: `Skill Type "${row.skillType}" not found live. Available: ${skillResult.availableOptions.join(', ')}` };
      }
    }

    await page.waitForTimeout(1200);

    const coreValues: [string, string][] = [
      ['Date of Assignment', row.dateOfAssignment],
      ['Name of the Patient', row.nameOfPatient],
      ['Patient Reg No', row.patientRegNo],
      ['Date of Birth', row.dateOfBirth],
      ['Age', row.age],
    ];
    for (const [name, value] of coreValues) {
      if (!value) continue;
      const field = leaf.fields.find((f) => stripDots(f.column_name) === stripDots(name));
      if (!field) continue;
      try {
        await fillOneField(page, stripDots(name), field.column_value_type === 'date' ? 'date' : 'text', value);
      } catch (err: any) {
        return { success: false, draftReference: null, failedField: name, error: err?.message ?? String(err) };
      }
    }

    for (const [key, value] of Object.entries(row.extraFields)) {
      if (key === '__PARSE_ERROR__') continue;
      const field = leaf.fields.find((f) => stripDots(f.column_name) === stripDots(key));
      if (!field) continue;
      try {
        await fillOneField(page, stripDots(field.column_name), field.column_value_type, value);
      } catch (err: any) {
        return { success: false, draftReference: null, failedField: key, error: err?.message ?? String(err) };
      }
    }

    for (const item of row.competencyItems) {
      const match = leaf.competencyGroup.find((c) => c.particulars.trim() === item.trim());
      if (!match) continue;
      try {
        const checkbox = page.locator(`input[type="checkbox"][name="${match.particulars.replace(/"/g, '\\"')}"]`).first();
        await checkbox.waitFor({ state: 'visible', timeout: 8000 });
        await checkbox.check();
        // Confirmed live (SYN-IVC-001 draft): clicking "Save as Draft"
        // immediately after check() can fire before React's onChange state
        // update settles, silently saving the entry with an EMPTY
        // competency_group despite the box visually appearing checked. A
        // short settle plus an explicit re-read of the checked state closes
        // that race.
        await page.waitForTimeout(300);
        const isChecked = await checkbox.isChecked();
        if (!isChecked) {
          return { success: false, draftReference: null, failedField: `CompetencyGroup: ${item}`, error: 'Checkbox did not remain checked after settling; aborting before an incomplete save.' };
        }

        // Every Procedural competency item, once checked, grows a nested
        // set of 4 Level checkboxes (fixed names levelOne..levelFour,
        // inserted as a DOM sibling right after this item) - the portal
        // renders all 4 regardless of which are actually valid for this
        // specific skill; only the mapped source data tells us which are
        // valid. Exactly one row.competencyItems entry is checked per row
        // throughout this project, so these fixed names are unambiguous
        // here. See resolveLevelForItem's doc comment for the exact
        // decision rule - this never invents a level. The explicit
        // per-row "CompetencyLevel" ExtraFieldsJSON key (validated already
        // by validateRow.ts before this function is ever called) takes
        // precedence whenever the item has more than one valid level.
        //
        // This Level concept applies globally by SkillType, not by
        // CaseType/Basic Surgical Skill: Procedural skill AND Communication
        // and Writing Skill items both carry mapped Level values in
        // output/form-map.json (confirmed live for Communication items too
        // - every mapped one has valid levels "3","4"); Interpretative
        // Skill items never do. skillTypeHasCompetencyLevel() is the single
        // shared source of truth for this, also used by validateRow.ts, so
        // the two can never diverge. Must NOT be inferred from
        // has_competence_levels or from whether any levels happen to be
        // mapped, since that flag is uniformly 1 across every competency
        // item regardless of skill type.
        if (skillTypeHasCompetencyLevel(leaf.pathLabels[2])) {
          const explicitLevel = row.extraFields['CompetencyLevel'];
          // TEST_ONLY_UNMAPPED_LEVEL_OVERRIDE - see validateRow.ts's matching
          // comment. Kept in exact sync with validateRow.ts's acceptance
          // rule so a row that passes dry-run validation can never then be
          // rejected here (or vice versa): same flag, same "1-4 only" gate.
          const testOnlyOverride = row.extraFields['TestOnlyLevelOverride']?.trim() === 'true';
          const trimmedExplicit = explicitLevel?.trim();
          const isRenderableLevel = trimmedExplicit != null && ['1', '2', '3', '4'].includes(trimmedExplicit);
          const levelResolution: LevelResolution =
            testOnlyOverride && isRenderableLevel
              ? { status: 'explicit-level-confirmed', validLevels: [trimmedExplicit!], selectedLevel: trimmedExplicit! }
              : resolveLevelForItem(leaf.leafId, match.particulars, explicitLevel);
          if (testOnlyOverride && isRenderableLevel) {
            logger.info(`  TEST_ONLY_UNMAPPED_LEVEL_OVERRIDE: using acknowledged Level ${trimmedExplicit} for "${item}", which is not in its mapped valid levels.`);
          }

          if (levelResolution.status === 'ambiguous-multiple-levels') {
            return {
              success: false,
              draftReference: null,
              failedField: `CompetencyGroup: ${item}`,
              error: `Cannot determine which Competency Level to select for "${item}": ${levelResolution.validLevels.length} valid levels are mapped (${levelResolution.validLevels.join(', ')}) but no explicit CompetencyLevel was provided for this row. Refusing to guess.`,
            };
          }
          if (levelResolution.status === 'invalid-explicit-level') {
            return {
              success: false,
              draftReference: null,
              failedField: `CompetencyGroup: ${item}`,
              error: `CompetencyLevel "${explicitLevel}" provided for "${item}" is not one of its valid mapped levels (${levelResolution.validLevels.join(', ') || 'none'}). Refusing to guess or substitute.`,
            };
          }
          if (levelResolution.status === 'no-levels-mapped') {
            return {
              success: false,
              draftReference: null,
              failedField: `CompetencyGroup: ${item}`,
              error: `No valid Competency Level is mapped for "${item}" in output/form-map.json, but this is a ${leaf.pathLabels[2]} competency item and the portal requires exactly one Level to be selected. This looks like a mapping gap, not a genuinely level-less item - refusing to save without a level.`,
            };
          }
          if (levelResolution.status === 'unselectable-level') {
            return {
              success: false,
              draftReference: null,
              failedField: `CompetencyGroup: ${item} > Level ${levelResolution.selectedLevel}`,
              error: `LEVEL5_PORTAL_UI_HOLD: mapped level "${levelResolution.selectedLevel}" for "${item}" has no corresponding Level checkbox in the live DOM (the portal only ever renders Level 1-4). This is a confirmed portal-side gap (2026-09-10 audit), not something this uploader can safely work around. Never substituting a different level or inventing a control - refusing to save this row.`,
            };
          }

          const levelCheckboxName = LEVEL_CHECKBOX_NAME[levelResolution.selectedLevel!];
          const levelCheckbox = page.locator(`input[type="checkbox"][name="${levelCheckboxName}"]`).first();
          await levelCheckbox.waitFor({ state: 'visible', timeout: 8000 });
          await levelCheckbox.check();
          await page.waitForTimeout(300);

          const levelStates = await page.evaluate(() => ({
            levelOne: (document.querySelector('input[name="levelOne"]') as HTMLInputElement | null)?.checked ?? null,
            levelTwo: (document.querySelector('input[name="levelTwo"]') as HTMLInputElement | null)?.checked ?? null,
            levelThree: (document.querySelector('input[name="levelThree"]') as HTMLInputElement | null)?.checked ?? null,
            levelFour: (document.querySelector('input[name="levelFour"]') as HTMLInputElement | null)?.checked ?? null,
          }));
          const levelIsChecked = levelStates[levelCheckboxName as keyof typeof levelStates] === true;
          const otherLevelsAllUnchecked = Object.entries(levelStates).every(([name, checked]) => name === levelCheckboxName || checked !== true);
          const skillStillChecked = await checkbox.isChecked();
          if (!levelIsChecked || !skillStillChecked || !otherLevelsAllUnchecked) {
            return {
              success: false,
              draftReference: null,
              failedField: `CompetencyGroup: ${item} > Level ${levelResolution.selectedLevel}`,
              error: `After selecting Level ${levelResolution.selectedLevel}, verification failed (level checked=${levelIsChecked}, main skill still checked=${skillStillChecked}, all other levels unchecked=${otherLevelsAllUnchecked}, states=${JSON.stringify(levelStates)}); aborting before an incomplete/incorrect save.`,
            };
          }
          logger.info(`  Competency "${item}": main skill checked, Level ${levelResolution.selectedLevel} selected and verified, all other levels confirmed unchecked.`);
        } else {
          logger.info(`  Competency "${item}": main skill checked (skill type "${leaf.pathLabels[2]}" - no Competency Level applies).`);
        }
      } catch (err: any) {
        return { success: false, draftReference: null, failedField: `CompetencyGroup: ${item}`, error: err?.message ?? String(err) };
      }
    }
    if (row.competencyItems.length > 0) {
      await page.waitForTimeout(500); // let the last checkbox's state fully propagate before saving
    }

    const saveDraftButton = finalSubmit
      ? page.locator('button:text-is("Submit")').first()
      : page.locator('button:has-text("Save as Draft")').first();
    await saveDraftButton.waitFor({ state: 'visible', timeout: 8000 });
    await saveDraftButton.click();
    await page.waitForTimeout(2000);

    const successBanner = await page
      .locator('.alert-success, .swal2-success, [class*="success" i]')
      .allTextContents()
      .catch(() => [] as string[]);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const draftReferenceMatch = bodyText.match(/(?:draft|reference|entry)[^\d]{0,20}([A-Za-z0-9-]{6,})/i);

    const looksSuccessful = successBanner.length > 0 || /success|saved/i.test(bodyText.slice(0, 2000));
    if (!looksSuccessful) {
      return { success: false, draftReference: null, failedField: null, error: 'No success confirmation detected after clicking Save as Draft.' };
    }

    return {
      success: true,
      draftReference: draftReferenceMatch ? draftReferenceMatch[1] : `saved-${Date.now()}`,
      failedField: null,
      error: null,
    };
  } catch (err: any) {
    logger.error(`fillAndSaveDraft crashed: ${err?.stack ?? err}`);
    return { success: false, draftReference: null, failedField: null, error: err?.message ?? String(err) };
  }
}
