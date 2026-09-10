/**
 * Safe repair workflow for EXISTING portal draft entries whose Procedural
 * competency item is checked but its nested Competency Level checkbox was
 * never selected (root cause: fillForm.ts never touched the level
 * checkboxes at all until this fix - see resolveLevelForItem in
 * ./fillForm.ts for the full explanation).
 *
 * This tool NEVER creates a new entry. It always opens the EXISTING
 * record via the portal's own "Edit" action (a modal reusing the same
 * form) and, if a repair is safely determinable, clicks the same
 * "Save as Draft" button the modal already uses as its update action.
 * It NEVER clicks "Submit". It NEVER deletes anything.
 *
 * Two modes:
 *   AUDIT_ONLY=true (default)  - read-only census via the portal's own
 *                                 trainee-log-entry-list API. No UI
 *                                 interaction, no writes. Produces a
 *                                 classification report.
 *   REPAIR_ONE_ENTRY_ID=<id>   - repairs exactly ONE existing entry,
 *                                 identified by its portal entry id (from
 *                                 the audit report). Refuses to run if
 *                                 more than one entry id is supplied.
 */
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { logger } from '../utils/logger';
import { authGet } from '../mapper/api';
import { env } from '../utils/env';
import { resolveLevelForItem, LEVEL_CHECKBOX_NAME } from './fillForm';
import { resolveFilteredListPosition, openEntryByExactPosition, capturePageFingerprint, waitForPageFingerprintSettled } from './portalRowLocator';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'output');

interface CompetencyGroupEntry {
  skill_name: string;
  level1: boolean;
  level2: boolean;
  level3: boolean;
  level4: boolean;
  status: boolean;
}
interface PortalEntry {
  id: string;
  logbook_entry_setup_master_id: string;
  approved_status: string;
  submit_ind: number;
  details_json: string;
}
interface RawPortalEntry extends PortalEntry {
  competency_group: CompetencyGroupEntry[];
}

// The 5 categories requested for this implementation (A-E), plus 3 rare
// administrative/anomaly categories retained from the original audit
// tooling for completeness (all confirmed 0 in the 2026-09-10 audit, but
// worth continuing to detect rather than silently assuming they stay 0).
export type Classification =
  | 'ALREADY_CORRECT' // A
  | 'AUTO_FIXABLE_SINGLE_LEVEL' // B
  | 'NEEDS_DECISION_MULTIPLE_LEVELS' // C
  | 'VASCULAR_HOLD' // D - confirmed live portal bug (loads Thoracic's schema instead) - never auto-repaired
  | 'LEVEL5_PORTAL_HOLD' // E - mapped level has no corresponding DOM checkbox - never auto-repaired, never substituted
  | 'INVALID_LEVEL_ALREADY_SET'
  | 'MULTIPLE_LEVELS_ALREADY_SET'
  | 'OUT_OF_SCOPE_NOT_DRAFT'
  | 'NO_LEVELS_MAPPED_FOR_SKILL';

// Confirmed live (2026-09-10 audit): selecting "Vascular Surgery" as Case
// Type silently loads Thoracic and Cardiovascular Surgery's schema
// instead. Any entry stored under these two Vascular leaf ids is held
// unconditionally - never auto-repaired, per explicit instruction not to
// touch Vascular entries or hardcode a workaround for the portal bug.
const VASCULAR_LEAF_IDS = new Set(['038b9461-529c-4473-b982-123e445548eb', '40abd843-3a66-4bd2-a6e4-bdcb76679cb7']);

export interface AuditRow {
  entryId: string;
  leafId: string;
  checkedSkill: string;
  classification: Classification;
  currentLevels: string[];
  validLevels: string[];
  resolvedLevel: string | null;
  approvedStatus: string;
  submitInd: number;
  patientRegNo: string | null;
  patientName: string | null;
  assignmentDate: string | null;
  caseType: string;
  skillType: string;
}

function parseDetails(entry: PortalEntry): Record<string, any> {
  try {
    return JSON.parse(entry.details_json);
  } catch {
    return {};
  }
}

function levelsChecked(c: CompetencyGroupEntry): string[] {
  const out: string[] = [];
  if (c.level1) out.push('1');
  if (c.level2) out.push('2');
  if (c.level3) out.push('3');
  if (c.level4) out.push('4');
  return out;
}

async function fetchAllEntries(page: any): Promise<RawPortalEntry[]> {
  const all: RawPortalEntry[] = [];
  for (let p = 1; p <= 60; p++) {
    const url = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=${p}&paginate_per_page=20`;
    const r = await authGet<{ success: boolean; data: { data: RawPortalEntry[]; last_page: number } }>(page, url);
    if (r.status !== 200 || !Array.isArray(r.body?.data?.data)) break;
    all.push(...r.body.data.data);
    if (p >= (r.body.data.last_page ?? 1)) break;
  }
  return all;
}

function classifyEntries(entries: RawPortalEntry[], proceduralLeaves: Map<string, { pathLabels: string[] }>): AuditRow[] {
  const rows: AuditRow[] = [];
  for (const e of entries) {
    const leafInfo = proceduralLeaves.get(e.logbook_entry_setup_master_id);
    if (!leafInfo) continue; // not a Procedural-skill leaf - out of scope for this tool entirely (Interpretative rows must never be touched)

    const details = parseDetails(e);
    const isDraft = e.approved_status === 'Draft' && e.submit_ind === 0;

    for (const c of e.competency_group ?? []) {
      if (!c.status) continue;
      const current = levelsChecked(c);
      const levelResolution = resolveLevelForItem(e.logbook_entry_setup_master_id, c.skill_name);

      let classification: Classification;
      if (VASCULAR_LEAF_IDS.has(e.logbook_entry_setup_master_id)) {
        classification = 'VASCULAR_HOLD';
      } else if (!isDraft) {
        classification = 'OUT_OF_SCOPE_NOT_DRAFT';
      } else if (levelResolution.status === 'unselectable-level') {
        classification = 'LEVEL5_PORTAL_HOLD';
      } else if (current.length > 1) {
        classification = 'MULTIPLE_LEVELS_ALREADY_SET';
      } else if (current.length === 1) {
        classification = levelResolution.validLevels.includes(current[0]) ? 'ALREADY_CORRECT' : 'INVALID_LEVEL_ALREADY_SET';
      } else if (levelResolution.status === 'no-levels-mapped') {
        classification = 'NO_LEVELS_MAPPED_FOR_SKILL';
      } else if (levelResolution.status === 'single-valid-level') {
        classification = 'AUTO_FIXABLE_SINGLE_LEVEL';
      } else {
        classification = 'NEEDS_DECISION_MULTIPLE_LEVELS';
      }

      rows.push({
        entryId: e.id,
        leafId: e.logbook_entry_setup_master_id,
        checkedSkill: c.skill_name,
        classification,
        currentLevels: current,
        validLevels: levelResolution.validLevels,
        resolvedLevel: levelResolution.selectedLevel,
        approvedStatus: e.approved_status,
        submitInd: e.submit_ind,
        patientRegNo: details['Patient Reg No'] ?? null,
        patientName: details['Name of the Patient'] ?? null,
        assignmentDate: details['Date of Assignment'] ?? null,
        caseType: leafInfo.pathLabels[1],
        skillType: leafInfo.pathLabels[2],
      });
    }
  }
  return rows;
}

export async function runAudit(page: any): Promise<AuditRow[]> {
  const formMap = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'output', 'form-map.json'), 'utf-8'));
  const proceduralLeaves = new Map<string, { pathLabels: string[] }>();
  for (const leaf of formMap.leaves ?? []) {
    if (leaf.pathLabels?.[2] === 'Procedural skill') proceduralLeaves.set(leaf.leafId, { pathLabels: leaf.pathLabels });
  }
  logger.info(`Known Procedural-skill leaves: ${proceduralLeaves.size}`);

  const entries = await fetchAllEntries(page);
  logger.info(`Fetched ${entries.length} total portal entries.`);

  const rows = classifyEntries(entries, proceduralLeaves);
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.classification] = (counts[r.classification] ?? 0) + 1;
  logger.info(`Classification counts: ${JSON.stringify(counts, null, 2)}`);

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const reportPath = path.join(REPORTS_DIR, 'procedural-level-repair-audit.json');
  fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), counts, rows }, null, 2), 'utf-8');
  logger.info(`Audit report written to ${reportPath}`);

  // Category C (NEEDS_DECISION_MULTIPLE_LEVELS) review file - report only,
  // never modifies the portal. No source workbook is traceable from a
  // saved portal entry today (ExternalRowId is not persisted by the
  // portal, and reg-no uniqueness across specialties was only enforced
  // starting with a later batch of datasets) - honestly marked as such
  // rather than guessed. No suggested level is ever offered without an
  // explicit source rule, which does not exist for any of these rows.
  const multiLevelRows = rows.filter((r) => r.classification === 'NEEDS_DECISION_MULTIPLE_LEVELS');
  const multiLevelReview = multiLevelRows.map((r) => ({
    portalEntryId: r.entryId,
    patientName: r.patientName,
    patientRegNo: r.patientRegNo,
    assignmentDate: r.assignmentDate,
    caseType: r.caseType,
    skillType: r.skillType,
    proceduralSkill: r.checkedSkill,
    allowedLevels: r.validLevels,
    currentLevelState: r.currentLevels.length > 0 ? r.currentLevels : 'none selected',
    sourceWorkbook: 'not traceable (portal does not persist ExternalRowId; no reliable join key survives to this entry)',
    suggestedIntendedLevel: null,
    decision: 'HUMAN_DECISION_REQUIRED',
  }));
  const multiLevelPath = path.join(REPORTS_DIR, 'procedural-level-multi-level-review.json');
  fs.writeFileSync(
    multiLevelPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), totalRequiringDecision: multiLevelReview.length, rows: multiLevelReview }, null, 2),
    'utf-8'
  );
  logger.info(`Multi-level decision review file written to ${multiLevelPath} (${multiLevelReview.length} rows, portal NOT modified).`);

  return rows;
}

export async function repairOneEntry(page: any, target: AuditRow): Promise<void> {
  if (target.classification !== 'AUTO_FIXABLE_SINGLE_LEVEL') {
    throw new Error(`Refusing to repair entry ${target.entryId}: classification is "${target.classification}", not AUTO_FIXABLE_SINGLE_LEVEL. This tool never guesses a level.`);
  }

  logger.info(`=== Repairing entry ${target.entryId} (${target.caseType} > ${target.skillType} > "${target.checkedSkill}") ===`);
  logger.info(`Target: RegNo=${target.patientRegNo}, Name=${target.patientName}, AssignmentDate=${target.assignmentDate}, resolvedLevel=${target.resolvedLevel}`);

  // Exact-identity row targeting: resolve this entry's (page, index)
  // position via the SAME filtered/paginated API call the portal's own
  // Search button issues (network-captured, read-only), rather than any
  // ambiguous date/case-type text match. This is a provably-unique
  // position, not a "most likely" guess - see portalRowLocator.ts for the
  // full rationale (a prior date+caseType text match found 13 candidate
  // rows for one entry and opened the wrong one via `.last()`).
  //
  // The portal's Draft-filtered list has NO Case Type filter option (only
  // Form and Status - confirmed by inspecting every <select> in the
  // search form), so it legitimately mixes ALL specialties under
  // "Procedural and Interpretative Skills" together, sorted by recency.
  // Any Draft activity anywhere in that entire form - not just this
  // target's own specialty - shifts everyone else's position between
  // when it's resolved and when it's actually clicked. openEntryByExactPosition
  // already refuses to click Edit on a mismatched row (fails closed, never
  // guesses) - but a single resolve can go stale. Retry with a FRESH
  // resolve + fresh navigation a few times before giving up, rather than
  // treating one transient mismatch as a hard failure.
  const MAX_TARGETING_ATTEMPTS = 3;
  let lastError: any = null;
  let opened = false;
  for (let attempt = 1; attempt <= MAX_TARGETING_ATTEMPTS && !opened; attempt++) {
    const position = await resolveFilteredListPosition(page, target.entryId, 'Procedural and Interpretative Skills', 'Draft');
    if (!position) {
      throw new Error(`AMBIGUOUS_MATCH: entry ${target.entryId} could not be resolved to an exact position in the filtered Draft list. Refusing to guess.`);
    }
    logger.info(`[attempt ${attempt}/${MAX_TARGETING_ATTEMPTS}] Resolved exact position for entry ${target.entryId}: filtered-list page ${position.page}, row index ${position.index}.`);

    await page.goto(`${env.baseUrl}/trainee/logbook-entry`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.locator('.rdt_TableRow').first().waitFor({ state: 'visible', timeout: 8000 });

    const formSelect = page.locator('select').first();
    await formSelect.selectOption({ label: 'Procedural and Interpretative Skills' });
    await page.waitForTimeout(300);
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption({ label: 'Draft' });
    await page.waitForTimeout(300);

    // Same race as "Next Page": the default (unfiltered) rows are already
    // visible before Search is clicked, so a plain visibility wait can pass
    // on the STALE pre-filter list. Wait for the fingerprint to actually
    // change instead.
    const beforeSearchFingerprint = await capturePageFingerprint(page);
    const searchButton = page.locator('button:has-text("Search")').first();
    await searchButton.click();
    await waitForPageFingerprintSettled(page, beforeSearchFingerprint);

    try {
      await openEntryByExactPosition(page, position, { caseType: target.caseType, skillType: target.skillType });
      opened = true;
    } catch (err: any) {
      lastError = err;
      logger.error(`[attempt ${attempt}/${MAX_TARGETING_ATTEMPTS}] Row targeting failed for entry ${target.entryId}: ${err?.message ?? err}`);
      if (attempt < MAX_TARGETING_ATTEMPTS) {
        logger.info('Retrying with a completely fresh position resolve and navigation (list may have shifted due to unrelated Draft activity elsewhere in the same form).');
      }
    }
  }
  if (!opened) {
    throw new Error(`AMBIGUOUS_MATCH: entry ${target.entryId} could not be reliably opened after ${MAX_TARGETING_ATTEMPTS} fresh attempts. Last error: ${lastError?.message ?? lastError}. Refusing to guess.`);
  }
  await page.waitForTimeout(2000);

  // Confirm we opened the RIGHT entry: the expected skill must be checked,
  // and no other skill should be checked in this entry (matches the
  // single-competency-item convention used throughout this project).
  const checkedSkillsInModal: string[] = await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    return boxes
      .filter((b) => b.checked && !['levelOne', 'levelTwo', 'levelThree', 'levelFour', 'Competency Group and Details'].includes(b.name))
      .map((b) => b.name);
  });
  logger.info(`Checked skill(s) inside opened Edit modal: ${JSON.stringify(checkedSkillsInModal)}`);
  if (checkedSkillsInModal.length !== 1 || checkedSkillsInModal[0] !== target.checkedSkill) {
    const closeButton = page.locator('button:has-text("Close")').last();
    await closeButton.click().catch(() => {});
    throw new Error(
      `AMBIGUOUS_MATCH: opened entry's checked skill(s) [${checkedSkillsInModal.join(', ')}] do not match the expected target skill "${target.checkedSkill}". Closed without saving. Refusing to guess.`
    );
  }

  // Snapshot every other field BEFORE making any change, to verify later
  // that nothing else was altered.
  const beforeSnapshot = await page.evaluate(() => {
    const fields = ['Date of Assignment', 'Name of the Patient', 'Patient Reg No', 'Date of Birth', 'Age', 'Diagnosis/Problems', 'Brief Procedural Notes', 'Brief Description'];
    const out: Record<string, string> = {};
    for (const name of fields) {
      const el = document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el) out[name] = el.value;
    }
    return out;
  });
  logger.info(`Snapshot of other fields BEFORE repair: ${JSON.stringify(beforeSnapshot, null, 2)}`);

  // Second, independent identity confirmation beyond the checked-skill
  // name: the frozen patient/date fields inside the opened modal must
  // exactly match what the audit recorded for this entry ID.
  const identityChecks: [string, string | null | undefined, string | undefined][] = [
    ['Patient Reg No', beforeSnapshot['Patient Reg No'], target.patientRegNo ?? undefined],
    ['Name of the Patient', beforeSnapshot['Name of the Patient'], target.patientName ?? undefined],
    ['Date of Assignment', beforeSnapshot['Date of Assignment'], target.assignmentDate ?? undefined],
  ];
  const identityMismatches = identityChecks.filter(([, actual, expected]) => expected !== undefined && actual !== expected);
  if (identityMismatches.length > 0) {
    const closeButton = page.locator('button:has-text("Close")').last();
    await closeButton.click().catch(() => {});
    throw new Error(
      `AMBIGUOUS_MATCH: opened entry's frozen fields do not match the expected target for entry ${target.entryId}: ${JSON.stringify(identityMismatches)}. Closed without saving. Refusing to guess.`
    );
  }
  logger.info(`Identity confirmed: RegNo/Name/AssignmentDate inside the opened modal match the target entry ${target.entryId}.`);

  const currentLevelStates = await page.evaluate(() => ({
    levelOne: (document.querySelector('input[name="levelOne"]') as HTMLInputElement | null)?.checked ?? null,
    levelTwo: (document.querySelector('input[name="levelTwo"]') as HTMLInputElement | null)?.checked ?? null,
    levelThree: (document.querySelector('input[name="levelThree"]') as HTMLInputElement | null)?.checked ?? null,
    levelFour: (document.querySelector('input[name="levelFour"]') as HTMLInputElement | null)?.checked ?? null,
  }));
  logger.info(`Level checkbox states BEFORE repair: ${JSON.stringify(currentLevelStates)}`);
  if (Object.values(currentLevelStates).some(Boolean)) {
    const closeButton = page.locator('button:has-text("Close")').last();
    await closeButton.click().catch(() => {});
    throw new Error(`Entry ${target.entryId} unexpectedly already has a level checked (re-fetched state disagrees with the audit snapshot) - closed without saving. Refusing to proceed without a fresh audit.`);
  }

  const levelCheckboxName = LEVEL_CHECKBOX_NAME[target.resolvedLevel!];
  const levelCheckbox = page.locator(`input[type="checkbox"][name="${levelCheckboxName}"]`).first();
  await levelCheckbox.waitFor({ state: 'visible', timeout: 8000 });
  await levelCheckbox.check();
  await page.waitForTimeout(300);

  const nowChecked = await levelCheckbox.isChecked();
  const skillStillChecked = await page.locator(`input[type="checkbox"][name="${target.checkedSkill}"]`).first().isChecked();
  if (!nowChecked || !skillStillChecked) {
    const closeButton = page.locator('button:has-text("Close")').last();
    await closeButton.click().catch(() => {});
    throw new Error(`After checking Level ${target.resolvedLevel}, verification failed (level checked=${nowChecked}, skill still checked=${skillStillChecked}). Closed without saving.`);
  }
  logger.info(`Level ${target.resolvedLevel} (${levelCheckboxName}) checked and verified, main skill "${target.checkedSkill}" still checked.`);

  // Save the EXISTING entry - this modal's "Save as Draft" button is the
  // update action for an already-open Edit (confirmed live during
  // diagnosis: no separate "Update" button exists). Never click "Submit".
  const saveAsDraftButton = page.locator('button:has-text("Save as Draft")').first();
  await saveAsDraftButton.waitFor({ state: 'visible', timeout: 8000 });
  await saveAsDraftButton.click();
  await page.waitForTimeout(2000);
  logger.info('Clicked "Save as Draft" to update the existing entry (never "Submit").');

  // Re-fetch this exact entry from the portal's own API to verify the
  // repair persisted and nothing else changed. The list is NOT reliably
  // sorted by most-recent-update (confirmed live: an entry just updated
  // was found on page 6, not page 1), so search across all pages rather
  // than assuming page 1.
  let refreshed: RawPortalEntry | undefined;
  for (let p = 1; p <= 60; p++) {
    const verifyUrl = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=${p}&paginate_per_page=20`;
    const verifyResult = await authGet<{ success: boolean; data: { data: RawPortalEntry[]; last_page: number } }>(page, verifyUrl);
    if (verifyResult.status !== 200 || !Array.isArray(verifyResult.body?.data?.data)) break;
    refreshed = verifyResult.body.data.data.find((e) => e.id === target.entryId);
    if (refreshed) break;
    if (p >= (verifyResult.body.data.last_page ?? 1)) break;
  }
  if (!refreshed) {
    throw new Error(`Post-repair verification: could not re-fetch entry ${target.entryId} from the portal's own list after searching all pages.`);
  }
  const refreshedDetails = parseDetails(refreshed);
  const refreshedSkill = refreshed.competency_group.find((c) => c.skill_name === target.checkedSkill);
  const afterLevels = refreshedSkill ? levelsChecked(refreshedSkill) : [];

  logger.info(`AFTER repair - portal-reported levels for "${target.checkedSkill}": ${JSON.stringify(afterLevels)}`);
  logger.info(`AFTER repair - portal-reported other fields: ${JSON.stringify(refreshedDetails, null, 2)}`);

  const levelCorrect = afterLevels.length === 1 && afterLevels[0] === target.resolvedLevel;
  const skillStillCheckedAfter = refreshedSkill?.status === true;
  const otherFieldsUnchanged = Object.entries(beforeSnapshot).every(([k, v]) => String(refreshedDetails[k] ?? '') === String(v));

  logger.info(`VERIFICATION: levelCorrect=${levelCorrect}, skillStillChecked=${skillStillCheckedAfter}, otherFieldsUnchanged=${otherFieldsUnchanged}`);
  if (!levelCorrect || !skillStillCheckedAfter || !otherFieldsUnchanged) {
    throw new Error(
      `POST-REPAIR VERIFICATION FAILED for entry ${target.entryId}: levelCorrect=${levelCorrect}, skillStillChecked=${skillStillCheckedAfter}, otherFieldsUnchanged=${otherFieldsUnchanged}. Manual inspection required.`
    );
  }
  logger.info(`=== Repair of entry ${target.entryId} verified successful. All other fields confirmed unchanged. ===`);
}

async function main() {
  const repairEntryId = process.env.REPAIR_ONE_ENTRY_ID;

  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      process.exit(2);
    }
    logger.info('Login confirmed.');

    const auditRows = await runAudit(page);

    if (!repairEntryId) {
      logger.info('AUDIT_ONLY mode (no REPAIR_ONE_ENTRY_ID set) - stopping after the read-only census. No entry was opened or modified.');
      return;
    }

    const target = auditRows.find((r) => r.entryId === repairEntryId);
    if (!target) {
      logger.error(`REPAIR_ONE_ENTRY_ID=${repairEntryId} was not found in this audit's results. Refusing to proceed.`);
      process.exitCode = 1;
      return;
    }

    await repairOneEntry(page, target);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    logger.error(`repair-procedural-levels crashed: ${err?.stack ?? err}`);
    process.exit(1);
  });
}
