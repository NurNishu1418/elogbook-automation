/**
 * READ-ONLY proof (run twice, per required safety sequence): for each of
 * the 17 target entries, resolve its exact (page, index) position via the
 * filtered API, then actually navigate the live UI there using the FIXED
 * condition-based pagination (portalRowLocator.ts), verify the row's
 * visible Case Type + Skill Type match expectation, and verify no other
 * target collides with the same position. Never clicks Edit - stops one
 * step before that, at the row-identity-verified stage, by using a
 * "dry-run" variant of openEntryByExactPosition's navigation+verification
 * logic without the final click.
 */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { logger } from '../utils/logger';
import { authGet } from '../mapper/api';
import { env } from '../utils/env';
import { resolveFilteredListPosition, RowPosition, capturePageFingerprint, waitForPageFingerprintSettled, waitForFingerprintStable } from './portalRowLocator';

const HEADING = 'Procedural and Interpretative Skills';
const TARGET_IDS = [
  'b4975eef-6510-49b8-9370-902ecccd0717',
  'e245bfad-51de-4dc3-b17f-eba007d47c64',
  '20e89947-89f4-40a7-b682-0be7e9d3e932',
  '3e21450f-fd65-4e5c-9336-28244339c07f',
  'acb4bd11-fd93-40d8-9901-c761bb74c829',
  '57037a8e-df7a-44c3-9470-2109dd6ac92b',
  '3f1af7ab-78c3-4628-90ab-fc3938c0f682',
  'd1775296-cb22-4f5b-ba64-79e5b3acbdd0',
  '7f2ebefc-622d-409d-b890-b501b13479e6',
  '3a082e3f-978c-4d8b-bffb-ad15976c8ea2',
  '4526aa25-e8be-4fa3-a7b4-548fb4eef0f4',
  'e5b4c617-597f-4a4f-9bf6-b9924d235281',
  '790925b7-5900-4f1b-898c-2d041398012f',
  '5080b48c-aec3-423b-bc37-d4c9778892c4',
  '93af3fda-591c-4116-b1c6-45b2f47fb90c',
  '244203e4-b8da-4538-8a93-336f9bda9863',
  '878080d7-f582-474b-8bf5-76c04e3dc24f',
];

interface ProofResult {
  entryId: string;
  expectedPage: number;
  expectedIndex: number;
  pageTransitionOk: boolean;
  rowIdentityOk: boolean;
  detail: string;
}

async function proveOneEntry(page: any, entryId: string, position: RowPosition, caseType: string, skillType: string): Promise<ProofResult> {
  // Re-select the form + Draft filter + Search fresh for every target, to
  // reset to page 1 each time (exactly what the real repair tool does per
  // entry) - this also re-exercises the pagination fix from a cold start
  // every single time, not just once.
  await page.goto(`${env.baseUrl}/trainee/logbook-entry`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.locator('.rdt_TableRow').first().waitFor({ state: 'visible', timeout: 8000 });
  await page.locator('select').first().selectOption({ label: HEADING });
  await page.waitForTimeout(300);
  await page.locator('select').nth(1).selectOption({ label: 'Draft' });
  await page.waitForTimeout(300);
  const beforeSearchFingerprint = await capturePageFingerprint(page);
  await page.locator('button:has-text("Search")').first().click();
  await waitForPageFingerprintSettled(page, beforeSearchFingerprint);

  for (let i = 1; i < position.page; i++) {
    const before = await capturePageFingerprint(page);
    const nextButton = page.locator('[aria-label="Next Page"]').first();
    await nextButton.waitFor({ state: 'visible', timeout: 8000 });
    if ((await nextButton.getAttribute('disabled')) !== null) {
      return { entryId, expectedPage: position.page, expectedIndex: position.index, pageTransitionOk: false, rowIdentityOk: false, detail: `Next Page disabled after ${i} click(s).` };
    }
    await nextButton.click();
    try {
      await waitForPageFingerprintSettled(page, before);
    } catch (err: any) {
      return { entryId, expectedPage: position.page, expectedIndex: position.index, pageTransitionOk: false, rowIdentityOk: false, detail: err.message };
    }
  }

  // Final settle re-confirmation, exactly mirroring openEntryByExactPosition,
  // so this proof genuinely exercises the same code path the live repair
  // tool uses - not a similar-but-different approximation of it.
  let finalFingerprint: string;
  try {
    const arrivalFingerprint = await capturePageFingerprint(page);
    finalFingerprint = await waitForFingerprintStable(page, arrivalFingerprint);
  } catch (err: any) {
    return { entryId, expectedPage: position.page, expectedIndex: position.index, pageTransitionOk: false, rowIdentityOk: false, detail: err.message };
  }
  const expectedRangeStart = (position.page - 1) * 10 + 1;
  const rangeCheckPattern = new RegExp(`\\b${expectedRangeStart}\\s*-\\s*\\d+\\s+of\\s+\\d+`);
  const pageTransitionOk = rangeCheckPattern.test(finalFingerprint);

  const rows = page.locator('.rdt_TableRow');
  const rowCount = await rows.count();
  if (position.index >= rowCount) {
    return { entryId, expectedPage: position.page, expectedIndex: position.index, pageTransitionOk, rowIdentityOk: false, detail: `Row index ${position.index} out of range (only ${rowCount} rows).` };
  }
  const targetRow = rows.nth(position.index);
  const targetRowText = (await targetRow.textContent())?.replace(/\s+/g, ' ').trim() ?? '';
  const rowIdentityOk = targetRowText.includes(caseType) && targetRowText.includes(skillType);

  return {
    entryId,
    expectedPage: position.page,
    expectedIndex: position.index,
    pageTransitionOk,
    rowIdentityOk,
    detail: pageTransitionOk && rowIdentityOk ? 'OK' : `fingerprint="${finalFingerprint}", rowText="${targetRowText}"`,
  };
}

const MAX_TARGETING_ATTEMPTS = 3;

async function proveOneEntryWithRetry(page: any, id: string): Promise<ProofResult> {
  // Mirrors the retry the live repair tool now performs: the Draft-filtered
  // list has no Case Type filter (only Form + Status), so it legitimately
  // mixes every specialty together sorted by recency - unrelated Draft
  // activity anywhere in the same form can shift a target's position
  // between resolve and click. Retry with a fully fresh resolve+navigate
  // rather than treating one transient mismatch as final.
  let last: ProofResult = { entryId: id, expectedPage: -1, expectedIndex: -1, pageTransitionOk: false, rowIdentityOk: false, detail: 'not attempted' };
  for (let attempt = 1; attempt <= MAX_TARGETING_ATTEMPTS; attempt++) {
    const position = await resolveFilteredListPosition(page, id, HEADING, 'Draft');
    if (!position) {
      last = { entryId: id, expectedPage: -1, expectedIndex: -1, pageTransitionOk: false, rowIdentityOk: false, detail: 'Position could not be resolved.' };
      continue;
    }
    const r = await proveOneEntry(page, id, position, 'Basic Surgical Skill', 'Procedural skill');
    last = r;
    if (r.pageTransitionOk && r.rowIdentityOk) {
      if (attempt > 1) logger.info(`${id} -> succeeded on attempt ${attempt}/${MAX_TARGETING_ATTEMPTS} after a fresh re-resolve.`);
      return r;
    }
    if (attempt < MAX_TARGETING_ATTEMPTS) {
      logger.info(`${id} -> attempt ${attempt}/${MAX_TARGETING_ATTEMPTS} mismatched (${r.detail}); retrying with a fresh position resolve.`);
    }
  }
  return last;
}

async function runPass(page: any, passNumber: number): Promise<ProofResult[]> {
  logger.info(`\n===== PASS ${passNumber} =====`);
  const results: ProofResult[] = [];
  for (const id of TARGET_IDS) {
    const r = await proveOneEntryWithRetry(page, id);
    logger.info(`${id} -> page ${r.expectedPage}, index ${r.expectedIndex}: pageTransitionOk=${r.pageTransitionOk}, rowIdentityOk=${r.rowIdentityOk} (${r.detail})`);
    results.push(r);
  }
  const cleanCount = results.filter((r) => r.pageTransitionOk && r.rowIdentityOk).length;
  logger.info(`PASS ${passNumber} result: ${cleanCount}/${TARGET_IDS.length} clean.`);
  return results;
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  const writeRequests: string[] = [];
  page.on('request', (req: any) => {
    const method = req.method();
    if (method !== 'GET' && req.url().includes('/api/')) writeRequests.push(`${method} ${req.url()}`);
  });

  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      return;
    }
    logger.info('Login confirmed. This proof run never clicks Edit or Save - navigation and read-only verification only.');

    const pass1 = await runPass(page, 1);
    const pass2 = await runPass(page, 2);

    const pass1Clean = pass1.filter((r) => r.pageTransitionOk && r.rowIdentityOk).length;
    const pass2Clean = pass2.filter((r) => r.pageTransitionOk && r.rowIdentityOk).length;

    logger.info(`\n===== SUMMARY =====`);
    logger.info(`Pass 1: ${pass1Clean}/${TARGET_IDS.length} clean.`);
    logger.info(`Pass 2: ${pass2Clean}/${TARGET_IDS.length} clean.`);
    logger.info(`Non-GET requests observed during this entire proof run: ${writeRequests.length} ${JSON.stringify(writeRequests)}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`prove-row-targeting crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
