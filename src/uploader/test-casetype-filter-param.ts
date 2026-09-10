/**
 * READ-ONLY test: does the trainee-log-entry-list endpoint accept a
 * case_type (or similarly named) query param to narrow the Draft list to
 * ONE specialty, eliminating cross-specialty position drift entirely?
 * Tries several plausible param names against the known Basic Surgical
 * Skill leaf id / label and inspects whether the result narrows.
 */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { authGet } from '../mapper/api';
import { logger } from '../utils/logger';
import { env } from '../utils/env';

async function tryParam(page: any, extraParam: string) {
  const url = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=1&paginate_per_page=10&heading=${encodeURIComponent('Procedural and Interpretative Skills')}&approved_status=Draft&${extraParam}`;
  const r = await authGet<{ success: boolean; data: { data: any[]; total: number } }>(page, url);
  const caseTypes = new Set(
    r.body.data.data.map((e: any) => {
      try {
        return JSON.parse(e.details_json).caseType;
      } catch {
        return 'PARSE_ERROR';
      }
    })
  );
  logger.info(`Param "${extraParam}" -> status=${r.status}, total=${r.body?.data?.total}, distinct caseTypes on page1=${JSON.stringify([...caseTypes])}`);
}

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
    logger.info('Login confirmed (read-only).');

    // Baseline (no case-type narrowing) for comparison.
    await tryParam(page, '');
    // Plausible param name guesses - all read-only GETs, never assumed to
    // work without checking the actual response.
    await tryParam(page, `case_type=${encodeURIComponent('Basic Surgical Skill')}`);
    await tryParam(page, `caseType=${encodeURIComponent('Basic Surgical Skill')}`);
    await tryParam(page, `logbook_entry_setup_master_id=18aab29a-bb60-4aad-965e-a669ab6648bf`);
    await tryParam(page, `entry_setup_master_id=18aab29a-bb60-4aad-965e-a669ab6648bf`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`test-casetype-filter-param crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
