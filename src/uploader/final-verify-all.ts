/** Read-only final audit: independently re-verifies every one of the 174 rows against the portal's own data. */
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { readDataEntryRows } from './excelReader';
import { validateRow, LeafForValidation } from './validateRow';
import { fetchRecentEntries, findMatchingEntry, compareEntryToRow } from './verifyEntrySaved';
import { logger } from '../utils/logger';

const DATASET_XLSX_PATH = path.resolve(__dirname, '..', '..', 'generated-data', 'Basic-Surgical-Skill', 'BCPS_Logbook_Basic_Surgical_Skill_TestData.xlsx');
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'output');

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();
  const loginResult = await ensureLoggedIn(page);
  if (!loginResult.success) {
    logger.error(`Login failed: ${loginResult.reason}`);
    await browser.close();
    process.exit(1);
  }

  const formMap = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'form-map.json'), 'utf-8'));
  const leaves: LeafForValidation[] = formMap.leaves.map((l: any) => ({
    leafId: l.leafId,
    pathLabels: l.pathLabels,
    fields: l.fields ?? [],
    competencyGroup: l.competencyGroup ?? [],
  }));

  const rows = (await readDataEntryRows(DATASET_XLSX_PATH)).filter((r) => r.action === 'SAVE_DRAFT');
  logger.info(`Auditing ${rows.length} rows against live portal data...`);

  logger.info('Fetching a broad snapshot of portal entries (read-only)...');
  const entries = await fetchRecentEntries(page, 20, 20);
  logger.info(`Fetched ${entries.length} entries.`);

  let foundCount = 0;
  let matchCount = 0;
  let notFound: string[] = [];
  let mismatched: { id: string; mismatches: string[] }[] = [];
  let notDraftStatus: string[] = [];
  let finalSubmitFlagged: string[] = [];

  for (const row of rows) {
    const result = validateRow(row, leaves);
    const leaf = result.resolvedLeaf!;
    const entry = findMatchingEntry(entries, row, leaf);
    if (!entry) {
      notFound.push(row.externalRowId);
      continue;
    }
    foundCount++;
    if (entry.approved_status !== 'Draft') notDraftStatus.push(`${row.externalRowId} (${entry.id}): status=${entry.approved_status}`);
    if (entry.submit_ind !== 0) finalSubmitFlagged.push(`${row.externalRowId} (${entry.id}): submit_ind=${entry.submit_ind}`);
    const cmp = compareEntryToRow(entry, row, leaf);
    if (cmp.matches) {
      matchCount++;
    } else {
      mismatched.push({ id: `${row.externalRowId} (${entry.id})`, mismatches: cmp.mismatches });
    }
  }

  logger.info(`AUDIT RESULT: ${foundCount}/${rows.length} found in portal, ${matchCount}/${foundCount} fully field-matched.`);
  logger.info(`Not found: ${JSON.stringify(notFound)}`);
  logger.info(`Not "Draft" status: ${JSON.stringify(notDraftStatus)}`);
  logger.info(`submit_ind != 0 (would indicate Final Submit): ${JSON.stringify(finalSubmitFlagged)}`);
  if (mismatched.length > 0) {
    logger.info('Mismatched entries:');
    mismatched.forEach((m) => logger.info(`  ${m.id}: ${m.mismatches.join(' | ')}`));
  }

  fs.writeFileSync(
    path.join(path.dirname(DATASET_XLSX_PATH), 'final-audit-report.json'),
    JSON.stringify({ totalRows: rows.length, foundCount, matchCount, notFound, notDraftStatus, finalSubmitFlagged, mismatched }, null, 2),
    'utf-8'
  );

  await browser.close();
}

main().catch((err) => {
  logger.error(`final-verify-all crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
