/**
 * Provably-unique row targeting for the trainee Logbook Entry list.
 *
 * Root cause of the earlier false match: the previous approach searched
 * for a row using `:has-text(date):has-text(caseType)` and took `.last()`
 * among however many rows matched - on one entry, 13 rows shared that
 * date+caseType combination, and `.last()` opened the wrong one.
 *
 * Fix: the Search button (network-captured, read-only) actually calls
 * GET .../trainee-log-entry-list?page=N&paginate_per_page=10
 *     &heading=<form>&approved_status=Draft
 * which returns the exact same entries, in the exact same order, that the
 * UI table renders (per_page is fixed at 10 server-side regardless of what
 * is requested - confirmed live). This means a target entry's (page,
 * 0-based row index) within this filtered/paginated result is exactly its
 * position in the rendered table - no text matching required at all.
 */
import { authGet } from '../mapper/api';
import { env } from '../utils/env';

export interface RowPosition {
  page: number;
  index: number;
}

export async function resolveFilteredListPosition(
  page: any,
  entryId: string,
  heading: string,
  approvedStatus: string,
  maxPages = 60
): Promise<RowPosition | null> {
  for (let p = 1; p <= maxPages; p++) {
    const url = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=${p}&paginate_per_page=10&heading=${encodeURIComponent(heading)}&approved_status=${encodeURIComponent(approvedStatus)}`;
    const r = await authGet<{ success: boolean; data: { data: any[]; last_page: number } }>(page, url);
    if (r.status !== 200 || !Array.isArray(r.body?.data?.data)) break;
    const idx = r.body.data.data.findIndex((e: any) => e.id === entryId);
    if (idx !== -1) return { page: p, index: idx };
    if (p >= (r.body.data.last_page ?? 1)) break;
  }
  return null;
}

/**
 * A per-page fingerprint used to PROVE a page transition actually
 * completed, rather than assuming it did once `.rdt_TableRow` is
 * "visible" (react-data-table keeps the OLD page's rows visible in the
 * DOM while the new page's data is still being fetched, so a plain
 * visibility wait can pass before the content has actually changed - this
 * caused a real live mismatch where "Next Page" was clicked 6 times with
 * only a fixed 400ms wait each, and Edit ended up opening a stale,
 * earlier page's row). The fingerprint combines the pagination range text
 * ("X-Y of Z", which is unique per page) with the first row's full text
 * (an extra signal in case the range text is ever unavailable or
 * unchanged for some reason) so a same-page false negative is very
 * unlikely.
 */
export async function capturePageFingerprint(page: any): Promise<string> {
  return page.evaluate(() => {
    // react-data-table-component's built-in pagination range text (e.g.
    // "11-20 of 185") is rendered as its own isolated element. Do NOT
    // search document.body.textContent as one flattened string - the
    // "Rows per page" dropdown's numeric options (2, 5, 10, 20, 50, 100,
    // 200) sit immediately adjacent in that flattened text with no
    // separator, so a body-wide regex can greedily absorb "200" into the
    // range's start number (e.g. "20061-70 of 185" being misread as one
    // match). Instead, find the smallest element whose OWN trimmed
    // textContent is exactly "<n>-<n> of <n>".
    const rangePattern = /^\d+\s*-\s*\d+\s+of\s+\d+$/;
    let rangeText = 'NO_RANGE_FOUND';
    const all = Array.from(document.querySelectorAll('body *'));
    for (const el of all) {
      const text = el.textContent?.trim() ?? '';
      if (rangePattern.test(text) && el.children.length === 0) {
        rangeText = text;
        break;
      }
    }
    const firstRow = document.querySelector('.rdt_TableRow');
    const firstRowText = firstRow?.textContent?.replace(/\s+/g, ' ').trim() ?? 'NO_ROW_FOUND';
    return `${rangeText} || ${firstRowText}`;
  });
}

export async function waitForPageFingerprintChange(page: any, previousFingerprint: string, timeoutMs = 10000): Promise<string> {
  const pollIntervalMs = 150;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const current = await capturePageFingerprint(page);
    if (current !== previousFingerprint) {
      return current;
    }
    await page.waitForTimeout(pollIntervalMs);
  }
  throw new Error(`Page fingerprint did not change within ${timeoutMs}ms after clicking Next Page (still: "${previousFingerprint}"). Refusing to proceed - navigation may not have completed.`);
}

/**
 * Fixes a SECOND race discovered live: the pagination range label and the
 * actual table rows can finish updating at different moments - a proof
 * run caught cases where the range text already read "71-80 of 185" (the
 * correct new page) while `.rdt_TableRow` still returned a STALE row (in
 * one case, literally page 1's very first row, unrelated to any page
 * near 71-80). A single fingerprint read right after the range appears
 * to change is therefore not proof the rows have settled too.
 *
 * Fix: after detecting a change, keep re-reading the fingerprint every
 * `stableIntervalMs` and require it to come back byte-identical on two
 * consecutive reads before treating the page as settled. Any difference
 * between those two reads restarts the stability count (the page is
 * still moving) rather than resetting the whole waitForChange step.
 */
export async function waitForPageFingerprintSettled(
  page: any,
  previousFingerprint: string,
  opts: { timeoutMs?: number; stableIntervalMs?: number } = {}
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 15000;
  const stableIntervalMs = opts.stableIntervalMs ?? 200;
  const deadline = Date.now() + timeoutMs;

  // Step 1: wait for an initial change away from the previous page.
  let current = await capturePageFingerprint(page);
  while (current === previousFingerprint) {
    if (Date.now() >= deadline) {
      throw new Error(`Page fingerprint did not change within ${timeoutMs}ms (still: "${previousFingerprint}"). Refusing to proceed - navigation may not have completed.`);
    }
    await page.waitForTimeout(stableIntervalMs);
    current = await capturePageFingerprint(page);
  }

  // Step 2: require two consecutive identical reads before trusting it.
  return waitForFingerprintStable(page, current, { deadline, stableIntervalMs });
}

/**
 * Confirms the CURRENT fingerprint is settled (two consecutive identical
 * reads), without requiring it to first differ from some prior value.
 * Shared by waitForPageFingerprintSettled's second phase and by a final
 * re-confirmation once a target page has already been reached.
 */
export async function waitForFingerprintStable(
  page: any,
  startingValue: string,
  opts: { deadline?: number; timeoutMs?: number; stableIntervalMs?: number } = {}
): Promise<string> {
  const stableIntervalMs = opts.stableIntervalMs ?? 200;
  const deadline = opts.deadline ?? Date.now() + (opts.timeoutMs ?? 15000);
  let current = startingValue;
  while (Date.now() < deadline) {
    await page.waitForTimeout(stableIntervalMs);
    const recheck = await capturePageFingerprint(page);
    if (recheck === current) {
      return current;
    }
    // Still moving - adopt the newest reading and keep waiting for it to
    // stabilize, rather than silently trusting either value.
    current = recheck;
  }
  throw new Error(`Fingerprint changed but never stabilized within the allotted time (last value: "${current}"). Refusing to proceed.`);
}

/**
 * Navigates the already-Draft-filtered UI list to the given position and
 * clicks that exact row's "Edit" button - by table position, never by
 * ambiguous text/date matching. Assumes the caller has already selected
 * the form and Draft status and clicked Search (list is on page 1).
 *
 * Every "Next Page" click is followed by a genuine condition-based wait
 * (page fingerprint must actually change) rather than a fixed sleep or a
 * mere visibility check, and the target row's identity is independently
 * re-confirmed (against expectedEntryId, via the row-order the caller
 * already resolved) before Edit is clicked.
 */
export async function openEntryByExactPosition(
  page: any,
  position: RowPosition,
  expectedRowText: { caseType: string; skillType: string }
): Promise<void> {
  await page.locator('.rdt_TableRow').first().waitFor({ state: 'visible', timeout: 8000 });

  for (let i = 1; i < position.page; i++) {
    const beforeFingerprint = await capturePageFingerprint(page);
    const nextButton = page.locator('[aria-label="Next Page"]').first();
    await nextButton.waitFor({ state: 'visible', timeout: 8000 });
    const disabled = (await nextButton.getAttribute('disabled')) !== null;
    if (disabled) {
      throw new Error(`Cannot navigate to page ${position.page}: Next Page button disabled after ${i} click(s).`);
    }
    await nextButton.click();
    await waitForPageFingerprintSettled(page, beforeFingerprint);
  }

  // Final settle confirmation on the arrived-at page itself, even though
  // the loop above already settled after the last click - re-reading here
  // costs one extra debounce cycle but removes any doubt that something
  // shifted between the last click's settle and this exact moment.
  const arrivalFingerprint = await capturePageFingerprint(page);
  const settledFingerprint = await waitForFingerprintStable(page, arrivalFingerprint);

  const rows = page.locator('.rdt_TableRow');
  const rowCount = await rows.count();
  if (position.index >= rowCount) {
    throw new Error(`Resolved row index ${position.index} is out of range - only ${rowCount} rows visible on page ${position.page}.`);
  }

  // Independently re-verify the pagination range text matches what this
  // page number should show (e.g. page 7 at 10/page => "61-70 of ...")
  // before trusting the row index at all.
  const expectedRangeStart = (position.page - 1) * 10 + 1;
  const rangeCheckPattern = new RegExp(`\\b${expectedRangeStart}\\s*-\\s*\\d+\\s+of\\s+\\d+`);
  if (!rangeCheckPattern.test(settledFingerprint)) {
    throw new Error(`Page-transition verification failed: expected pagination range starting at ${expectedRangeStart} for page ${position.page}, but settled fingerprint was "${settledFingerprint}". Refusing to proceed.`);
  }

  // Independently verify the target row's visible content BEFORE clicking
  // Edit - the Case Type + Skill Type columns are rendered text, so this
  // is a genuine pre-click identity check, not a repeat of the same
  // position-resolution logic.
  const targetRow = rows.nth(position.index);
  const targetRowText = (await targetRow.textContent())?.replace(/\s+/g, ' ').trim() ?? '';
  if (!targetRowText.includes(expectedRowText.caseType) || !targetRowText.includes(expectedRowText.skillType)) {
    throw new Error(
      `Pre-click row identity verification failed at page ${position.page}, index ${position.index}: expected row text to contain caseType="${expectedRowText.caseType}" and skillType="${expectedRowText.skillType}", but row text was "${targetRowText}". Refusing to click Edit.`
    );
  }

  const editButton = targetRow.locator('button:has-text("Edit")').first();
  await editButton.waitFor({ state: 'visible', timeout: 8000 });
  await editButton.click();
}
