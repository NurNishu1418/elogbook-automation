/**
 * READ-ONLY: checks whether any existing portal entry that is nominally a
 * "Thoracic and Cardiovascular Surgery" entry actually contains Vascular
 * Surgery-flavoured content (Diagnosis/Problems or Interpretations text
 * mentioning vascular-specific terms) - evidence that the Vascular
 * case-type portal bug previously caused a row to be silently saved under
 * the wrong Case Type instead of failing loudly.
 */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { logger } from '../utils/logger';
import { authGet } from '../mapper/api';
import { env } from '../utils/env';

const THORACIC_INTERP_LEAF = 'd44b7f87-71ba-4583-88f3-8ba19a112fc6';
const THORACIC_PROC_LEAF = '8aa758e2-151a-4afb-a86b-6d31ded5fde8';
const VASCULAR_TERMS = /vascular|arter|aneurysm|hemangioma|thrombo|embolectomy|carotid|doppler|angiogram|dsa\b|mrv\b/i;

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
    const all: any[] = [];
    for (let p = 1; p <= 60; p++) {
      const url = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=${p}&paginate_per_page=20`;
      const r = await authGet<{ success: boolean; data: { data: any[]; last_page: number } }>(page, url);
      if (r.status !== 200 || !Array.isArray(r.body?.data?.data)) break;
      all.push(...r.body.data.data);
      if (p >= (r.body.data.last_page ?? 1)) break;
    }
    logger.info(`Fetched ${all.length} entries.`);

    const thoracicEntries = all.filter((e) => e.logbook_entry_setup_master_id === THORACIC_INTERP_LEAF || e.logbook_entry_setup_master_id === THORACIC_PROC_LEAF);
    logger.info(`Entries nominally under Thoracic and Cardiovascular Surgery: ${thoracicEntries.length}`);

    const suspicious = thoracicEntries.filter((e) => {
      try {
        const details = JSON.parse(e.details_json);
        const text = [details['Indication/Investigation/Findings/Diagnosis'], details['Interpretations'], details['Diagnosis/Problems'], details['Brief Procedural Notes'], details['Brief Description']].filter(Boolean).join(' ');
        return VASCULAR_TERMS.test(text);
      } catch {
        return false;
      }
    });
    logger.info(`Thoracic entries whose TEXT CONTENT looks vascular-flavoured (possible silent cross-contamination): ${suspicious.length}`);
    for (const e of suspicious) {
      const details = JSON.parse(e.details_json);
      logger.info(JSON.stringify({ id: e.id, regNo: details['Patient Reg No'], name: details['Name of the Patient'], date: details['Date of Assignment'], text: details }, null, 2));
    }

    // Also check: are there ANY entries at all under the two VASCULAR leaf
    // ids (proving at least some Vascular saves succeeded correctly)?
    const VASCULAR_INTERP_LEAF = '038b9461-529c-4473-b982-123e445548eb';
    const VASCULAR_PROC_LEAF = '40abd843-3a66-4bd2-a6e4-bdcb76679cb7';
    const vascularEntries = all.filter((e) => e.logbook_entry_setup_master_id === VASCULAR_INTERP_LEAF || e.logbook_entry_setup_master_id === VASCULAR_PROC_LEAF);
    logger.info(`Entries genuinely saved under the correct Vascular Surgery leaf ids: ${vascularEntries.length}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`check-vascular-contamination crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
