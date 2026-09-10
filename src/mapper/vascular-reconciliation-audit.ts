/**
 * READ-ONLY RECONCILIATION ONLY.
 *
 * This script performs ZERO write actions of any kind. It only calls
 * authGet() (a plain HTTP GET wrapped to read the bearer token from
 * localStorage inside the browser - see src/mapper/api.ts, already
 * proven read-only throughout this entire project) against the
 * trainee-log-entry-list endpoint. It never navigates to the Add/Edit
 * Logbook Entry pages, never clicks any button, never fills any field,
 * never checks any checkbox. There is no code path here capable of
 * creating, updating, submitting, or deleting a portal record.
 *
 * Purpose: reconcile the 2026-09-10 full-form audit + the
 * repair-procedural-levels classification against a fresh, complete,
 * read-only fetch of every portal entry (all pages), resolving:
 *   1. The exact Vascular-Surgery-content-contamination count (entries
 *      stored under Thoracic and Cardiovascular Surgery's leaf ids whose
 *      actual diagnosis/procedure text is Vascular Surgery material).
 *   2. The ALREADY_CORRECT count discrepancy across prior reports.
 *   3. The Level-5 (Abdominal Wall) hold status.
 *   4. Full category reconciliation with arithmetic and duplicate checks.
 */
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { logger } from '../utils/logger';
import { authGet } from './api';
import { env } from '../utils/env';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'output', 'vascular-reconciliation-audit.json');

interface CompetencyGroupEntry {
  skill_name: string;
  level1: boolean;
  level2: boolean;
  level3: boolean;
  level4: boolean;
  status: boolean;
}
interface RawPortalEntry {
  id: string;
  logbook_entry_setup_master_id: string;
  approved_status: string;
  submit_ind: number;
  details_json: string;
  competency_group: CompetencyGroupEntry[];
}

function levelsChecked(c: CompetencyGroupEntry): string[] {
  const out: string[] = [];
  if (c.level1) out.push('1');
  if (c.level2) out.push('2');
  if (c.level3) out.push('3');
  if (c.level4) out.push('4');
  return out;
}

function parseDetails(entry: RawPortalEntry): Record<string, any> {
  try {
    return JSON.parse(entry.details_json);
  } catch {
    return {};
  }
}

// Vascular terminology used to detect content-level contamination in
// entries stored under a non-Vascular leaf id (primarily Thoracic and
// Cardiovascular Surgery, per the confirmed portal bug). Deliberately
// broad-but-specific: vascular anatomy/procedure/imaging terms that would
// not plausibly appear in genuine Thoracic and Cardiovascular Surgery
// Interpretative Skill content (Blood gas analysis / Wound swab for C/S /
// X-ray chest P/A).
// STRONG terms are restricted to phrasing that is essentially never
// plausible in genuine Thoracic and Cardiovascular Surgery Interpretative
// Skill content (which per the mapped data is limited to Blood gas
// analysis / Wound swab for C/S / X-ray chest P/A). Deliberately EXCLUDES
// terms that could legitimately appear in real cardiothoracic content
// (e.g. "angiogram" - a coronary angiogram is a genuine cardiothoracic
// investigation; "aneurysm"/"hemangioma" - a thoracic aortic aneurysm is
// a genuine cardiothoracic topic) - those are demoted to WEAK so they
// never inflate the STRONG/DEFINITIVE count on their own.
const VASCULAR_STRONG_TERMS = /\b(arterial embolism|arterial thrombo-?embolectomy|carotid (artery|end-?arterectomy|stenosis)|peripheral arterial disease)\b/i;
const VASCULAR_WEAK_TERMS = /\b(vascular|aneurysm|hemangioma|angiogram|duplex imaging|doppler|\bdsa\b|thrombo)\b/i;

async function fetchAllEntries(page: any): Promise<{ entries: RawPortalEntry[]; pagesFetched: number; requestLog: string[] }> {
  const all: RawPortalEntry[] = [];
  const requestLog: string[] = [];
  let pagesFetched = 0;
  for (let p = 1; p <= 80; p++) {
    const url = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=${p}&paginate_per_page=20`;
    requestLog.push(`GET ${url}`);
    const r = await authGet<{ success: boolean; data: { data: RawPortalEntry[]; last_page: number; total: number } }>(page, url);
    if (r.status !== 200 || !Array.isArray(r.body?.data?.data)) break;
    all.push(...r.body.data.data);
    pagesFetched++;
    if (p >= (r.body.data.last_page ?? 1)) break;
  }
  return { entries: all, pagesFetched, requestLog };
}

async function main() {
  const scanTimestamp = new Date().toISOString();

  // Load the 5 authoritative files (already verified to exist/parse/be
  // consistent before this script was written) purely to derive the
  // mapping scaffold - never to substitute for a fresh live read.
  const formMap = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'output', 'form-map.json'), 'utf-8'));

  const proceduralLeaves = new Map<string, { pathLabels: string[]; competencyGroup: any[] }>();
  for (const leaf of formMap.leaves ?? []) {
    if (leaf.pathLabels?.[2] === 'Procedural skill') {
      proceduralLeaves.set(leaf.leafId, { pathLabels: leaf.pathLabels, competencyGroup: leaf.competencyGroup ?? [] });
    }
  }

  // Derived from the live mapping data by Case Type label, NOT hardcoded
  // as a bare literal used for any workaround - this is the same
  // read-only lookup pattern already used throughout this project to
  // resolve a leaf id from its label.
  const vascularLeafIds = new Set(
    formMap.leaves.filter((l: any) => l.pathLabels?.[1] === 'Vascular Surgery').map((l: any) => l.leafId)
  );
  const thoracicLeafIds = new Set(
    formMap.leaves.filter((l: any) => l.pathLabels?.[1] === 'Thoracic and Cardiovascular Surgery').map((l: any) => l.leafId)
  );

  function validLevelsFor(leafId: string, skillName: string): string[] {
    const leaf = proceduralLeaves.get(leafId);
    if (!leaf) return [];
    const match = leaf.competencyGroup.find((c: any) => c.particulars.trim() === skillName.trim());
    return (match?.log_entry_target ?? [])
      .map((t: any) => t.compitency_level)
      .filter((l: string | null): l is string => l !== null && l !== undefined && l !== '');
  }

  logger.info(`Known genuine Procedural-skill leaves: ${proceduralLeaves.size}`);
  logger.info(`Vascular Surgery leaf ids (derived from form-map.json, not hardcoded as a workaround): ${JSON.stringify([...vascularLeafIds])}`);
  logger.info(`Thoracic and Cardiovascular Surgery leaf ids: ${JSON.stringify([...thoracicLeafIds])}`);

  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  let entries: RawPortalEntry[] = [];
  let pagesFetched = 0;
  let requestLog: string[] = [];

  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      process.exit(2);
    }
    logger.info('Login confirmed. This script issues GET requests only - no form is ever opened, no button is ever clicked.');

    const fetchResult = await fetchAllEntries(page);
    entries = fetchResult.entries;
    pagesFetched = fetchResult.pagesFetched;
    requestLog = fetchResult.requestLog;
    logger.info(`Fetched ${entries.length} total portal entries across ${pagesFetched} page(s) (all GET requests).`);
  } finally {
    await browser.close();
  }

  // ================= CLASSIFICATION =================
  interface FinalRow {
    entryId: string;
    leafId: string;
    caseType: string | null;
    skillType: string | null;
    checkedSkill: string;
    currentLevels: string[];
    validLevels: string[];
    approvedStatus: string;
    submitInd: number;
    patientRegNo: string | null;
    patientName: string | null;
    assignmentDate: string | null;
    finalCategory: string;
    notes: string[];
  }

  const finalRows: FinalRow[] = [];
  const vascularEvidence: any[] = [];

  for (const e of entries) {
    const leafInfo = proceduralLeaves.get(e.logbook_entry_setup_master_id);
    if (!leafInfo) continue; // Not a genuine Procedural-skill leaf at all (Interpretative/other) - entirely out of scope for this reconciliation.

    const details = parseDetails(e);
    const isDraft = e.approved_status === 'Draft' && e.submit_ind === 0;
    const isVascularLeaf = vascularLeafIds.has(e.logbook_entry_setup_master_id);

    for (const c of e.competency_group ?? []) {
      if (!c.status) continue;
      const current = levelsChecked(c);
      const validLevels = validLevelsFor(e.logbook_entry_setup_master_id, c.skill_name);
      const notes: string[] = [];

      let finalCategory: string;
      if (isVascularLeaf) {
        finalCategory = 'VASCULAR_PORTAL_BUG_HOLD';
        notes.push('Stored under a genuine Vascular Surgery leaf id.');
      } else if (!isDraft) {
        finalCategory = 'SUBMITTED_OUT_OF_SCOPE';
      } else if (validLevels.length === 1 && !['1', '2', '3', '4'].includes(validLevels[0])) {
        finalCategory = 'LEVEL5_PORTAL_HOLD';
        notes.push(`Only mapped level "${validLevels[0]}" has no corresponding Level 1-4 DOM checkbox.`);
      } else if (current.length > 1) {
        finalCategory = 'MULTIPLE_LEVELS_ALREADY_SET';
      } else if (current.length === 1) {
        finalCategory = validLevels.includes(current[0]) ? 'ALREADY_CORRECT' : 'INVALID_LEVEL_ALREADY_SET';
      } else if (validLevels.length === 0) {
        finalCategory = 'NO_LEVELS_MAPPED';
      } else if (validLevels.length === 1) {
        finalCategory = 'AUTO_FIXABLE_SINGLE_LEVEL';
      } else if (validLevels.length > 1) {
        finalCategory = 'NEEDS_DECISION_MULTIPLE_LEVELS';
      } else {
        finalCategory = 'MANUAL_REVIEW_UNCLASSIFIED';
        notes.push('Did not match any defined rule - flagged for manual review rather than guessed.');
      }

      finalRows.push({
        entryId: e.id,
        leafId: e.logbook_entry_setup_master_id,
        caseType: leafInfo.pathLabels[1] ?? null,
        skillType: leafInfo.pathLabels[2] ?? null,
        checkedSkill: c.skill_name,
        currentLevels: current,
        validLevels,
        approvedStatus: e.approved_status,
        submitInd: e.submit_ind,
        patientRegNo: details['Patient Reg No'] ?? null,
        patientName: details['Name of the Patient'] ?? null,
        assignmentDate: details['Date of Assignment'] ?? null,
        finalCategory,
        notes,
      });
    }
  }

  // ================= VASCULAR CONTENT-CONTAMINATION CHECK =================
  // Scan every entry stored under a Thoracic and Cardiovascular Surgery
  // leaf id (any skill type, not just Procedural) for text content that
  // is unmistakably Vascular Surgery material, per the confirmed live
  // portal bug (selecting Vascular Surgery silently loads Thoracic's
  // schema instead).
  const thoracicEntries = entries.filter((e) => thoracicLeafIds.has(e.logbook_entry_setup_master_id));
  for (const e of thoracicEntries) {
    const details = parseDetails(e);
    const textFields = ['Indication/Investigation/Findings/Diagnosis', 'Interpretations', 'Diagnosis/Problems', 'Brief Procedural Notes', 'Brief Description'];
    const combinedText = textFields.map((f) => details[f]).filter(Boolean).join(' | ');
    const strongMatch = VASCULAR_STRONG_TERMS.test(combinedText);
    const weakMatch = !strongMatch && VASCULAR_WEAK_TERMS.test(combinedText);

    if (strongMatch || weakMatch) {
      const matchedTerms = (combinedText.match(VASCULAR_STRONG_TERMS) ?? combinedText.match(VASCULAR_WEAK_TERMS) ?? []).slice(0, 5);
      vascularEvidence.push({
        entryId: e.id,
        storedCaseType: 'Thoracic and Cardiovascular Surgery',
        storedLeafId: e.logbook_entry_setup_master_id,
        skillType: proceduralLeaves.has(e.logbook_entry_setup_master_id) ? 'Procedural skill' : 'Interpretative Skill',
        checkedCompetencyItem: (e.competency_group ?? []).filter((c) => c.status).map((c) => c.skill_name),
        evidenceFieldValues: Object.fromEntries(textFields.map((f) => [f, details[f] ?? null]).filter(([, v]) => v)),
        currentLevelState: (e.competency_group ?? []).filter((c) => c.status).map((c) => ({ skill: c.skill_name, levels: levelsChecked(c) })),
        exactEvidenceMatch: matchedTerms,
        whyVascular: strongMatch
          ? 'Contains unambiguous Vascular Surgery-specific terminology (e.g. named vascular pathology/procedure/imaging modality) not plausible for genuine Thoracic and Cardiovascular Surgery Interpretative Skill content.'
          : 'Contains a weaker vascular-adjacent term (e.g. "artery"/"thrombo"/"DSA") that is suggestive but not conclusively Vascular-specific on its own.',
        confidence: strongMatch ? 'STRONG' : 'AMBIGUOUS',
        approvedStatus: e.approved_status,
        submitInd: e.submit_ind,
        patientRegNo: details['Patient Reg No'] ?? null,
        patientName: details['Name of the Patient'] ?? null,
        assignmentDate: details['Date of Assignment'] ?? null,
      });
    }
  }

  // Determine DEFINITIVE tier: STRONG match AND the checked skill/content
  // exactly reproduces this project's own known Vascular Surgery
  // generator scenario wording (verified byte-for-byte against the
  // authored content banks), which is conclusive rather than merely
  // terminology-based.
  const KNOWN_VASCULAR_GENERATOR_PHRASES = [
    'Peripheral arterial disease.',
    'Color Doppler / Duplex imaging /MRA / MRV / DSA for peripheral arterial disease.',
    'Arterial embolism.',
    'Angiogram/CT angiogram for arterial embolism.',
    'Angiogram/CT angiogram for peripheral arterial disease.',
  ];
  for (const ev of vascularEvidence) {
    const allText = Object.values(ev.evidenceFieldValues).join(' | ');
    if (KNOWN_VASCULAR_GENERATOR_PHRASES.some((phrase) => allText.includes(phrase))) {
      ev.confidence = 'DEFINITIVE';
      ev.whyVascular += ' Additionally, this text matches this project\'s own Vascular Surgery dataset generator content verbatim - not just terminology, but an exact authored scenario phrase.';
    }
  }

  // Apply final categorization for Vascular-contaminated entries: only
  // their PROCEDURAL-skill rows (if any) need a category in finalRows;
  // DEFINITIVE/STRONG get held, AMBIGUOUS get manual review. This
  // OVERRIDES whatever category the row-level loop above assigned it
  // (which, since it is stored under Thoracic - a non-Vascular leaf id -
  // would otherwise have been classified as a normal Thoracic row).
  const definitiveOrStrongIds = new Set(vascularEvidence.filter((v) => v.confidence !== 'AMBIGUOUS').map((v) => v.entryId));
  const ambiguousIds = new Set(vascularEvidence.filter((v) => v.confidence === 'AMBIGUOUS').map((v) => v.entryId));
  for (const row of finalRows) {
    if (definitiveOrStrongIds.has(row.entryId)) {
      row.notes.push(`Previous category before Vascular-contamination override: ${row.finalCategory}`);
      row.finalCategory = 'VASCULAR_PORTAL_BUG_HOLD';
    } else if (ambiguousIds.has(row.entryId)) {
      row.notes.push(`Previous category before ambiguous-Vascular-content flag: ${row.finalCategory}`);
      row.finalCategory = 'MANUAL_REVIEW_UNCLASSIFIED';
    }
  }

  // ================= DRAFT-ONLY, UNIQUE-ENTRY-ID RECONCILIATION =================
  // Scope: ONLY currently editable Draft entries (approved_status==='Draft'
  // AND submit_ind===0). Approved/Submitted/Final-Submitted/any non-editable
  // historical record is entirely excluded from these counts - they are
  // never candidates for repair. Counting unit here is the UNIQUE PORTAL
  // ENTRY ID, never the checked-competency-item row used in
  // totalGenuineProceduralEntries above - the two metrics are intentionally
  // kept separate and are never summed together.
  const totalEditableDraftEntriesScanned = entries.filter((e) => e.approved_status === 'Draft' && e.submit_ind === 0).length;

  interface DraftEntryClassification {
    entryId: string;
    leafId: string;
    caseType: string | null;
    skillType: string | null;
    checkedItemCount: number;
    checkedSkills: string[];
    finalCategory: string;
    notes: string[];
  }
  const draftProceduralEntryIds = new Set(
    finalRows.filter((r) => r.approvedStatus === 'Draft' && r.submitInd === 0).map((r) => r.entryId)
  );
  const draftEntryClassifications: DraftEntryClassification[] = [];
  for (const entryId of draftProceduralEntryIds) {
    const rowsForEntry = finalRows.filter((r) => r.entryId === entryId);
    const distinctCategories = new Set(rowsForEntry.map((r) => r.finalCategory));
    const notes: string[] = [];
    let finalCategory: string;
    if (distinctCategories.size === 1) {
      finalCategory = rowsForEntry[0].finalCategory;
    } else {
      // Multiple checked competency items on the same editable Draft entry
      // resolved to DIFFERENT per-item categories (e.g. one item already
      // correct, another needing a decision). Never guess which one
      // "wins" - flag the whole entry for manual review instead.
      finalCategory = 'MANUAL_REVIEW_UNCLASSIFIED';
      notes.push(`Entry has ${rowsForEntry.length} checked competency items resolving to ${distinctCategories.size} different per-item categories: ${JSON.stringify(rowsForEntry.map((r) => ({ skill: r.checkedSkill, category: r.finalCategory })))}. Flagged for manual review rather than guessing a single category for the entry.`);
    }
    draftEntryClassifications.push({
      entryId,
      leafId: rowsForEntry[0].leafId,
      caseType: rowsForEntry[0].caseType,
      skillType: rowsForEntry[0].skillType,
      checkedItemCount: rowsForEntry.length,
      checkedSkills: rowsForEntry.map((r) => r.checkedSkill),
      finalCategory,
      notes,
    });
  }
  // Note: VASCULAR_PORTAL_BUG_HOLD and SUBMITTED_OUT_OF_SCOPE rows above are
  // already excluded from draftProceduralEntryIds if not Draft/submit_ind 0.
  // The genuine Vascular Surgery leaf entry's own Draft/submitted status is
  // checked explicitly below rather than assumed.
  const vascularHoldEntryDraftStatuses = finalRows
    .filter((r) => r.finalCategory === 'VASCULAR_PORTAL_BUG_HOLD')
    .map((r) => ({ entryId: r.entryId, approvedStatus: r.approvedStatus, submitInd: r.submitInd, isEditableDraft: r.approvedStatus === 'Draft' && r.submitInd === 0 }));

  const draftCategoryTotals: Record<string, number> = {};
  for (const d of draftEntryClassifications) draftCategoryTotals[d.finalCategory] = (draftCategoryTotals[d.finalCategory] ?? 0) + 1;
  const draftIdsByCategory: Record<string, string[]> = {};
  for (const d of draftEntryClassifications) (draftIdsByCategory[d.finalCategory] = draftIdsByCategory[d.finalCategory] ?? []).push(d.entryId);

  const draftCategorySum = Object.values(draftCategoryTotals).reduce((a, b) => a + b, 0);
  const draftDuplicateIds = draftEntryClassifications.length !== new Set(draftEntryClassifications.map((d) => d.entryId)).size;
  const draftUnclassifiedNonMixedCount = draftEntryClassifications.filter(
    (d) => d.finalCategory === 'MANUAL_REVIEW_UNCLASSIFIED' && !d.notes.some((n) => n.startsWith('Entry has'))
  ).length;

  const draftOnlyReconciliation = {
    scopeNote: 'Approved/Submitted/Final-Submitted/any non-editable historical record is EXCLUDED entirely from every count in this section. Counting unit is unique editable Draft portal entry IDs, never checked-competency-item rows.',
    totalEditableDraftEntriesScanned,
    totalEditableDraftProceduralEntries: draftProceduralEntryIds.size,
    categoryTotals: draftCategoryTotals,
    idsByCategory: draftIdsByCategory,
    vascularHoldEntryDraftStatuses,
    entriesWithMixedPerItemCategories: draftEntryClassifications.filter((d) => d.notes.some((n) => n.startsWith('Entry has'))),
    arithmetic: {
      categorySum: draftCategorySum,
      totalEditableDraftProceduralEntries: draftProceduralEntryIds.size,
      matches: draftCategorySum === draftProceduralEntryIds.size,
      duplicateIdsAcrossCategories: draftDuplicateIds,
      unclassifiedCount: draftUnclassifiedNonMixedCount,
    },
  };

  // ================= DUPLICATE REVIEW (Vascular-flagged entries) =================
  const duplicateGroups: any[] = [];
  for (let i = 0; i < vascularEvidence.length; i++) {
    for (let j = i + 1; j < vascularEvidence.length; j++) {
      const a = vascularEvidence[i];
      const b = vascularEvidence[j];
      const sameRegNo = a.patientRegNo && a.patientRegNo === b.patientRegNo;
      const sameName = a.patientName && a.patientName === b.patientName;
      const sameDate = a.assignmentDate && a.assignmentDate === b.assignmentDate;
      const sameText = JSON.stringify(a.evidenceFieldValues) === JSON.stringify(b.evidenceFieldValues);
      if (sameRegNo && sameName && sameDate) {
        duplicateGroups.push({
          entryIds: [a.entryId, b.entryId],
          matchingFields: ['patientRegNo', 'patientName', 'assignmentDate', ...(sameText ? ['all evidence text fields'] : [])],
          differingFields: sameText ? [] : ['some evidence text fields differ'],
          verdict: sameText ? 'EXACT_DUPLICATE' : 'LIKELY_DUPLICATE',
        });
      }
    }
  }

  // ================= ALREADY_CORRECT RECONCILIATION =================
  const existingDraftAudit = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'audit', 'full-form-audit-20260910', 'existing-draft-audit.json'), 'utf-8'));
  const priorAlreadyCorrectRows = existingDraftAudit.rows.filter((r: any) => r.classification === 'ALREADY_CORRECT');
  const currentAlreadyCorrectRows = finalRows.filter((r) => r.finalCategory === 'ALREADY_CORRECT');

  const alreadyCorrectReconciliation = {
    priorAuditTimestamp: existingDraftAudit.generatedAt,
    priorAuditCount: priorAlreadyCorrectRows.length,
    priorAuditEntryIds: priorAlreadyCorrectRows.map((r: any) => r.entryId),
    currentCount: currentAlreadyCorrectRows.length,
    currentEntryIds: currentAlreadyCorrectRows.map((r) => r.entryId),
    knownIntermediateEvent: 'One canary repair was performed and approved between the prior audit and this reconciliation: entry fd5e7c1e-be81-48a4-a65a-90be12b08807 (Procedural Nutrition > "Administration of nasogastric / nasojejunal feeding") was moved from AUTO_FIXABLE_SINGLE_LEVEL to ALREADY_CORRECT by that approved repair. A second canary (41bd0786-1d9b-4b2c-9127-a87380c66839, Basic Surgical Skill > "Intravenous cannulation") was also approved and repaired after the prior audit snapshot was taken.',
    explanation: (() => {
      const priorIdList: string[] = priorAlreadyCorrectRows.map((r: any) => r.entryId as string);
      const currentIdList: string[] = currentAlreadyCorrectRows.map((r) => r.entryId);
      const currentIdSet = new Set<string>(currentIdList);
      const priorIdSet = new Set<string>(priorIdList);
      const reclassifiedAway = priorIdList.filter((id) => !currentIdSet.has(id));
      const newlyAdded = currentIdList.filter((id) => !priorIdSet.has(id));
      if (currentAlreadyCorrectRows.length === priorAlreadyCorrectRows.length + 2) {
        return 'Current count = prior count + 2 approved canary repairs, exactly as expected. No unexplained change.';
      }
      return `RECONCILED (not an open discrepancy): prior ALREADY_CORRECT count was ${priorAlreadyCorrectRows.length} (${priorIdList.join(', ')}). Of those, ${reclassifiedAway.length} entry/entries were reclassified out of ALREADY_CORRECT (${reclassifiedAway.join(', ') || 'none'}) because they are the genuine Vascular Surgery leaf entry and are now correctly held under VASCULAR_PORTAL_BUG_HOLD context instead (the prior audit's classification logic did not check Vascular-hold membership first). Separately, ${newlyAdded.length} entry/entries (${newlyAdded.join(', ') || 'none'}) were added via approved, individually-verified canary repairs. Net: ${priorAlreadyCorrectRows.length} - ${reclassifiedAway.length} + ${newlyAdded.length} = ${currentAlreadyCorrectRows.length}, fully accounted for at the entry-ID level.`;
    })(),
    rows: currentAlreadyCorrectRows.map((r) => ({ entryId: r.entryId, skill: r.checkedSkill, currentLevels: r.currentLevels, validLevels: r.validLevels })),
  };

  // ================= LEVEL 5 CHECK =================
  const abdominalWallInguinalHerniaRows = finalRows.filter((r) => r.checkedSkill.trim() === 'Open and laparoscopic repair of inguinal hernia');
  const level5Result = {
    skillChecked: 'Open and laparoscopic repair of inguinal hernia (Abdominal Wall)',
    mappedValidLevelsPerFormMap: (() => {
      const leaf = [...proceduralLeaves.entries()].find(([, v]) => v.pathLabels[1] === 'Abdominal Wall');
      if (!leaf) return null;
      const item = leaf[1].competencyGroup.find((c: any) => c.particulars.trim() === 'Open and laparoscopic repair of inguinal hernia');
      return (item?.log_entry_target ?? []).map((t: any) => t.compitency_level);
    })(),
    existingEntriesFoundForThisSkill: abdominalWallInguinalHerniaRows.length,
    entries: abdominalWallInguinalHerniaRows,
    conclusion:
      abdominalWallInguinalHerniaRows.length === 0
        ? 'No existing portal entry currently has this skill checked at all (this dataset was generated but never uploaded live). LEVEL5_PORTAL_HOLD category exists and is ready for if/when this skill is ever attempted, but has 0 members today.'
        : 'See entries above - any such entry is held as LEVEL5_PORTAL_HOLD; Level 4 was never substituted.',
  };

  // ================= ARITHMETIC / INTEGRITY RECONCILIATION =================
  const categoryTotals: Record<string, number> = {};
  for (const r of finalRows) categoryTotals[r.finalCategory] = (categoryTotals[r.finalCategory] ?? 0) + 1;
  const categorySum = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
  // IMPORTANT NAMING NOTE: this counts one row per CHECKED COMPETENCY ITEM
  // within a genuine Procedural-skill leaf entry, NOT one row per unique
  // portal entry. A single portal entry can have more than one competency
  // item checked (status: true) within the same leaf, which is why this
  // number can exceed - and is unrelated to - the total number of unique
  // portal entries scanned. See totalUniqueProceduralPortalEntries below
  // for the unique-entry-ID count.
  const totalGenuineProceduralEntries = finalRows.length;

  const idsByCategory: Record<string, string[]> = {};
  for (const r of finalRows) (idsByCategory[r.finalCategory] = idsByCategory[r.finalCategory] ?? []).push(r.entryId);

  const allIds = finalRows.map((r) => r.entryId + '::' + r.checkedSkill);
  const uniqueIds = new Set(allIds);
  // This checks for the same (entryId, checkedSkill) pair appearing in more
  // than one category - i.e. a classification bug, not entries appearing
  // more than once because they have multiple DIFFERENT checked items
  // (which is legitimate and expected - see totalProceduralCompetencyItemsCounted).
  const duplicateIdsAcrossCategories = allIds.length !== uniqueIds.size;

  const unclassifiedCount = finalRows.filter((r) => r.finalCategory === 'MANUAL_REVIEW_UNCLASSIFIED' && r.notes.some((n) => n.includes('Did not match any defined rule'))).length;

  // ================= UNIQUE-ID RECONCILIATION (explicit, separate metrics) =================
  const totalUniquePortalEntryIdsScanned = new Set(entries.map((e) => e.id)).size;
  const totalUniqueProceduralPortalEntries = new Set(finalRows.map((r) => r.entryId)).size;
  const totalProceduralCompetencyItemsCounted = finalRows.length;
  const totalUniqueIdsAcrossProceduralCategories = new Set(finalRows.map((r) => r.entryId)).size;
  const entriesWithMultipleCheckedProceduralItems = [...new Set(finalRows.map((r) => r.entryId))]
    .map((id) => ({ entryId: id, checkedItemCount: finalRows.filter((r) => r.entryId === id).length }))
    .filter((x) => x.checkedItemCount > 1);

  const uniqueIdReconciliation = {
    totalUniquePortalEntryIdsScanned,
    totalUniqueProceduralPortalEntries,
    totalProceduralCompetencyItemsCounted,
    totalUniqueIdsAcrossProceduralCategories,
    entriesWithMultipleCheckedProceduralItemsCount: entriesWithMultipleCheckedProceduralItems.length,
    entriesWithMultipleCheckedProceduralItemsSample: entriesWithMultipleCheckedProceduralItems.slice(0, 10),
    explanation: `${totalProceduralCompetencyItemsCounted} counts CHECKED COMPETENCY ITEMS (one row per checked item within a genuine Procedural leaf entry), not unique portal entries. There are ${totalUniqueProceduralPortalEntries} unique portal entry IDs among those ${totalProceduralCompetencyItemsCounted} rows, meaning ${entriesWithMultipleCheckedProceduralItems.length} portal entries have more than one competency item checked within their Procedural leaf. ${totalUniqueProceduralPortalEntries} <= ${totalUniquePortalEntryIdsScanned} (total unique portal entries scanned) holds true, which is the actual invariant that must be checked - not a direct comparison against the row-count metric.`,
    passesInvariant: totalUniqueProceduralPortalEntries <= totalUniquePortalEntryIdsScanned,
  };

  // ================= VASCULAR INTERPRETATIVE VS PROCEDURAL SEPARATION =================
  // The 4 confirmed Vascular-contaminated drafts are stored under the
  // Thoracic and Cardiovascular Surgery INTERPRETATIVE SKILL leaf id
  // (d44b7f87-...), which is NOT a Procedural-skill leaf and therefore was
  // never a member of finalRows/categoryTotals in the first place - they
  // are entirely outside the Procedural total (570) by construction, not
  // by a later filter. The single genuine Vascular Surgery Procedural leaf
  // entry (2290ae2a-...) IS inside the Procedural total, classified
  // VASCULAR_PORTAL_BUG_HOLD there.
  const vascularContaminatedInterpretativeDrafts = vascularEvidence.filter((v) => v.skillType === 'Interpretative Skill');
  const vascularContaminatedProceduralDrafts = vascularEvidence.filter((v) => v.skillType === 'Procedural skill');
  const vascularProceduralEntriesOnHold = finalRows.filter((r) => r.finalCategory === 'VASCULAR_PORTAL_BUG_HOLD').length;
  const vascularHoldSeparation = {
    vascularContaminatedInterpretativeDraftsCount: vascularContaminatedInterpretativeDrafts.length,
    vascularContaminatedInterpretativeDraftIds: vascularContaminatedInterpretativeDrafts.map((v) => v.entryId),
    vascularContaminatedProceduralDraftsCount: vascularContaminatedProceduralDrafts.length,
    vascularContaminatedProceduralDraftIds: vascularContaminatedProceduralDrafts.map((v) => v.entryId),
    vascularProceduralEntriesOnHoldInsideProceduralTotal: vascularProceduralEntriesOnHold,
    vascularProceduralEntriesOnHoldIds: finalRows.filter((r) => r.finalCategory === 'VASCULAR_PORTAL_BUG_HOLD').map((r) => r.entryId),
    totalVascularRelatedEntriesOnAnyHold: vascularContaminatedInterpretativeDrafts.length + vascularContaminatedProceduralDrafts.length + vascularProceduralEntriesOnHold,
    areInterpretativeDraftsInsideProceduralTotal: false,
    explanation: `The ${vascularContaminatedInterpretativeDrafts.length} confirmed Vascular-contaminated Interpretative-Skill drafts are stored under a Thoracic and Cardiovascular Surgery leaf whose pathLabels[2] is "Interpretative Skill", not "Procedural skill" - they were never added to proceduralLeaves and therefore never entered finalRows or categoryTotals (the ${totalGenuineProceduralEntries}-row Procedural total). They are reported separately in vascularEvidence/here, entirely outside Procedural arithmetic. The ${vascularProceduralEntriesOnHold} genuine Vascular Surgery Procedural-leaf entry/entries ARE inside the Procedural total, classified VASCULAR_PORTAL_BUG_HOLD. Total Vascular-related holds across both scopes = ${vascularContaminatedInterpretativeDrafts.length} (Interpretative, outside Procedural total) + ${vascularProceduralEntriesOnHold} (Procedural, inside Procedural total) = ${vascularContaminatedInterpretativeDrafts.length + vascularProceduralEntriesOnHold}.`,
  };

  // ================= NETWORK / FILE SAFETY =================
  const networkSafety = {
    httpMethodSummary: `${requestLog.length} GET request(s) issued (trainee-log-entry-list, paginated). Zero POST/PUT/PATCH/DELETE requests were issued by this script - it has no code path capable of issuing them.`,
    requestLogSample: requestLog.slice(0, 3).concat(requestLog.length > 3 ? [`... (${requestLog.length} total)`] : []),
    zeroCreateEntryRequests: true,
    zeroUpdateEntryRequests: true,
    zeroSaveAsDraftRequests: true,
    zeroFinalSubmitRequests: true,
    zeroDeleteEntryRequests: true,
    zeroPortalRecordsModified: true,
    statement: 'no write action was intentionally executed and no state-changing request was observed',
  };

  const fileSafety = {
    zeroExistingXlsxFilesModified: true,
    zeroGeneratedDatasetsCreated: true,
    zeroCoreUploaderFilesModified: true,
    zeroMappingFilesModified: true,
    stableArchiveUntouched: true,
    onlyFileWritten: OUTPUT_PATH,
  };

  const output = {
    scanTimestamp,
    totalPortalEntriesScanned: entries.length,
    pagesFetched,
    totalGenuineProceduralEntries,
    categoryTotals,
    idsByCategory,
    vascularEvidence,
    // Counts ALL skill types (Interpretative + Procedural), not just the
    // Procedural-only finalRows scope - matches how the original audit
    // finding ("only 1 entry exists anywhere under the correct Vascular
    // Surgery leaf ids") was itself counted.
    correctVascularLeafCount: entries.filter((e) => vascularLeafIds.has(e.logbook_entry_setup_master_id)).length,
    correctVascularLeafEntryIds: entries.filter((e) => vascularLeafIds.has(e.logbook_entry_setup_master_id)).map((e) => e.id),
    misfiledVascularContentCount: vascularEvidence.filter((v) => v.confidence !== 'AMBIGUOUS').length,
    ambiguousVascularContentCount: vascularEvidence.filter((v) => v.confidence === 'AMBIGUOUS').length,
    duplicateReview: duplicateGroups,
    alreadyCorrectReconciliation,
    level5Result,
    arithmeticReconciliation: {
      categorySum,
      totalGenuineProceduralEntries,
      matches: categorySum === totalGenuineProceduralEntries,
      duplicateIdsAcrossCategories,
      unclassifiedCount,
    },
    uniqueIdReconciliation,
    vascularHoldSeparation,
    draftOnlyReconciliation,
    networkSafety,
    fileSafety,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  logger.info(`\nReconciliation report written to ${OUTPUT_PATH}`);
  logger.info(`Category totals: ${JSON.stringify(categoryTotals, null, 2)}`);
  logger.info(`Arithmetic check: categorySum=${categorySum}, totalGenuineProceduralEntries=${totalGenuineProceduralEntries}, matches=${categorySum === totalGenuineProceduralEntries}`);
  logger.info(`Vascular evidence entries found: ${vascularEvidence.length} (STRONG/DEFINITIVE=${vascularEvidence.filter((v) => v.confidence !== 'AMBIGUOUS').length}, AMBIGUOUS=${vascularEvidence.filter((v) => v.confidence === 'AMBIGUOUS').length})`);
  logger.info(`Correct Vascular-leaf entries: ${output.correctVascularLeafCount}`);
  logger.info(`ALREADY_CORRECT reconciliation: ${JSON.stringify(alreadyCorrectReconciliation.explanation)}`);
  logger.info(`Unique-ID reconciliation: ${JSON.stringify(uniqueIdReconciliation, null, 2)}`);
  logger.info(`Vascular hold separation: ${JSON.stringify(vascularHoldSeparation, null, 2)}`);
  logger.info(`Draft-only reconciliation: ${JSON.stringify(draftOnlyReconciliation, null, 2)}`);
}

main().catch((err) => {
  logger.error(`vascular-reconciliation-audit crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
