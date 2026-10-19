/**
 * Upload 28 Academic Activity entries for 2nd 2nd (2026 dates)
 * from BCPS_Academic_Activities_28_Entries_2026.docx
 *
 * Usage:
 *   npx ts-node src/scripts/upload-academic-2nd2nd.ts          # dry-run
 *   npx ts-node src/scripts/upload-academic-2nd2nd.ts --execute # live
 */
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { launchBrowser, newContext, settle } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { env } from '../utils/env';

const BASE = env.baseUrl;
const ADD_URL = `${BASE}/trainee/logbook/academic-activities/add`;
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', '..', 'screenshots', 'academic-2nd2nd');

const SKIP_INDICES = new Set<number>([]);

interface GrandRoundEntry {
  type: 'Grand round/ clinical meeting presentations';
  date: string;
  description: string;
}
interface JournalClubEntry {
  type: 'Journal club presentation';
  date: string;
  reference: string;
}
interface MortalityEntry {
  type: 'Mortality/Morbidity meeting presentations/Clinical audit';
  date: string;
  description: string;
}
interface TutorialEntry {
  type: 'Tutorials/small group teaching attended';
  date: string;
  topic: string;
  tutor: string;
}
interface OtherLectureEntry {
  type: 'Other Lectures attended';
  date: string;
  topic: string;
  lecturer: string;
}
interface MandatoryLectureEntry {
  type: 'Mandatory Lectures attended';
  date: string;
  topicType: string;
  skillType: string;
  venue: string;
  speaker: string;
}

type AcademicEntry =
  | GrandRoundEntry
  | JournalClubEntry
  | MortalityEntry
  | TutorialEntry
  | OtherLectureEntry
  | MandatoryLectureEntry;

const ENTRIES: AcademicEntry[] = [
  // 1. Grand round / clinical meeting presentations (2)
  {
    type: 'Grand round/ clinical meeting presentations',
    date: '2026-07-21',
    description: '75 year old female diabetic hypertensive presented with left lower quadrant pain with decrease in caliber of stools. History of weight loss for last 6 months. Difficulty in defecation and occasional vomiting. On DRE, there is a palpable mass found 7-8cm from anal verge. The patient is now fit for general anesthesia and plan for abdominoperineal resection with permanent colostomy in left iliac fossa.',
  },
  {
    type: 'Grand round/ clinical meeting presentations',
    date: '2026-08-17',
    description: "Carcinoma head of the pancreas: Whipple's procedure (Pancreaticoduodenectomy) was done under GA by bilateral subcostal incision. Reconstructive anastomosis of pancreaticojejunostomy, hepaticojejunostomy & gastrojejunostomy was done. Two drain insitu.",
  },

  // 2. Journal club presentation (1)
  {
    type: 'Journal club presentation',
    date: '2026-08-24',
    reference: '1. Title: Efficacy of Bimix Ointment for Pain Relief in Acute Anal Fissure. 2. Article selected: Comparative evaluation of 5% lignocaine ointment and a combination of 0.2% glyceryl trinitrate and 5% lignocaine in management of acute fissure in ano. Authors: Vundavalli Sattibabu, Satish Dalal, Mahavir Singh, Chisel Bhatia. Journal: International Surgery Journal. Year: 2017; 4(9):3113–3116. DOI: 10.18203/2349-2902.isj20173898',
  },

  // 3. Mortality/Morbidity meeting presentations / Clinical audit (1)
  {
    type: 'Mortality/Morbidity meeting presentations/Clinical audit',
    date: '2026-07-31',
    description: '55 years old male received in Emergency OSEC, presented with shortness of breath and chest pain. Mode of arrival on stretcher. He had history of RTA 2 hours back. Patient was immediately shifted to ICU for urgent need of ventilation. After doing several biochemical tests, patient was admitted into this hospital for 5 days. Consultation done with nephrologist, cardiologist, pulmonologist. Patient declared expired on 5th day of admission.',
  },

  // 4. Tutorials/small group teaching attended (8)
  { type: 'Tutorials/small group teaching attended', date: '2026-07-23', topic: 'Thyroid gland', tutor: 'Dr. Md. Latiful Bari' },
  { type: 'Tutorials/small group teaching attended', date: '2026-08-01', topic: 'Jaundice', tutor: 'Dr. Nur Mohammed Sharif Ovi' },
  { type: 'Tutorials/small group teaching attended', date: '2026-09-30', topic: 'Hematuria', tutor: 'Dr. Nur Mohammed Sharif Ovi' },
  { type: 'Tutorials/small group teaching attended', date: '2026-07-12', topic: 'Ulcer & Gangrene', tutor: 'Dr. Tanusree Barman' },
  { type: 'Tutorials/small group teaching attended', date: '2026-08-14', topic: 'Diabetic foot', tutor: 'Dr. Tanusree Barman' },
  { type: 'Tutorials/small group teaching attended', date: '2026-07-15', topic: 'Types of Shock and management', tutor: 'Dr. Md. Shahiduzzaman' },
  { type: 'Tutorials/small group teaching attended', date: '2026-09-08', topic: 'Ureteric Stone', tutor: 'Dr. Humayun Kabir Kallol' },
  { type: 'Tutorials/small group teaching attended', date: '2026-07-23', topic: 'Carcinoma of Rectum', tutor: 'Dr. Humayun Kabir Kallol' },

  // 5. Other Lectures attended (8)
  { type: 'Other Lectures attended', date: '2026-09-18', topic: 'Urethral stricture', lecturer: 'Dr. Md. Shahiduzzaman' },
  { type: 'Other Lectures attended', date: '2026-07-09', topic: 'Fibroadenoma of breast', lecturer: 'Dr. Md. Latiful Bari' },
  { type: 'Other Lectures attended', date: '2026-08-17', topic: 'Ca breast', lecturer: 'Dr. Md. Latiful Bari' },
  { type: 'Other Lectures attended', date: '2026-08-13', topic: 'Ca colon', lecturer: 'Dr. Md. Latiful Bari' },
  { type: 'Other Lectures attended', date: '2026-08-28', topic: 'Ca caecum', lecturer: 'Dr. Imarat Hossain Romel' },
  { type: 'Other Lectures attended', date: '2026-09-08', topic: 'Renal stone', lecturer: 'Dr. Md. Shahiduzzaman' },
  { type: 'Other Lectures attended', date: '2026-09-15', topic: 'Benign enlargement of prostate', lecturer: 'Dr. Md. Shahiduzzaman' },
  { type: 'Other Lectures attended', date: '2026-07-13', topic: 'Obstructed Inguinal Hernia: A Case-Based Approach to Diagnosis and Emergency Management', lecturer: 'Dr. Fatema Sultana' },

  // 6. Mandatory Lectures attended (8)
  { type: 'Mandatory Lectures attended', date: '2026-07-13', topicType: 'Surgical Oncology', skillType: 'Principles of Surgical oncology', venue: 'Kurmitola Multicare Specialized Hospital', speaker: 'Prof. Dr. Qamruzzaman' },
  { type: 'Mandatory Lectures attended', date: '2026-07-31', topicType: 'Palliative Surgery', skillType: 'Principles of Palliative care including end of life care', venue: 'Kurmitola general hospital', speaker: 'Dr. Imarat Hossain Romel' },
  { type: 'Mandatory Lectures attended', date: '2026-08-20', topicType: 'Palliative Surgery', skillType: 'Management of chronic pain', venue: 'Kurmitola general hospital', speaker: 'Dr. Imarat Hossain Romel' },
  { type: 'Mandatory Lectures attended', date: '2026-09-01', topicType: 'Surgical Oncology', skillType: 'Paraneoplastic syndrome', venue: 'Kurmitola Multicare Specialized Hospital', speaker: 'Dr. Md. Rafiqul islam' },
  { type: 'Mandatory Lectures attended', date: '2026-09-04', topicType: 'Professional behaviors', skillType: 'Probity and Ethics', venue: 'Bcps', speaker: 'Dr. Yousuf' },
  { type: 'Mandatory Lectures attended', date: '2026-09-30', topicType: 'Trauma and Orthopaedics', skillType: 'Physiotherapy and rehabilitation', venue: 'Dhaka medical college and hospital', speaker: 'Dr. Md. Ibrahim khalil' },
  { type: 'Mandatory Lectures attended', date: '2026-07-07', topicType: 'Professional behaviors', skillType: 'Promotion of Self Care', venue: 'Bcps', speaker: 'Dr. Yousuf' },
  { type: 'Mandatory Lectures attended', date: '2026-07-10', topicType: 'Professional behaviors', skillType: 'Brain death', venue: 'Bcps', speaker: 'Dr. Yousuf' },
];

async function setNativeInputValue(page: any, selector: string, value: string) {
  await page.evaluate(({ sel, val }: { sel: string; val: string }) => {
    const input = document.querySelector(sel) as HTMLInputElement;
    if (!input) throw new Error(`Input not found: ${sel}`);
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )!.set!;
    setter.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { sel: selector, val: value });
}

async function setNativeTextareaValue(page: any, selector: string, value: string) {
  await page.evaluate(({ sel, val }: { sel: string; val: string }) => {
    const ta = document.querySelector(sel) as HTMLTextAreaElement;
    if (!ta) throw new Error(`Textarea not found: ${sel}`);
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )!.set!;
    setter.call(ta, val);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  }, { sel: selector, val: value });
}

async function fillEntry(page: any, entry: AcademicEntry): Promise<{ ok: boolean; error?: string }> {
  try {
    await page.goto(ADD_URL, { waitUntil: 'domcontentloaded' });
    await settle(page, 1200);

    if (page.url().includes('/login')) {
      logger.info('  Session expired, re-logging in...');
      const relogin = await ensureLoggedIn(page);
      if (!relogin.success) return { ok: false, error: 'Re-login failed' };
      await page.goto(ADD_URL, { waitUntil: 'domcontentloaded' });
      await settle(page, 1200);
    }

    await page.selectOption('select[name="form"]', { label: 'Academic Activity' });
    await settle(page, 1200);

    await page.selectOption('select[name="skillType1"]', { label: entry.type });
    await settle(page, 1500);

    if (entry.type === 'Mandatory Lectures attended') {
      const ml = entry as MandatoryLectureEntry;
      await page.selectOption('select[name="skillType2"]', { label: ml.topicType });
      await settle(page, 1500);
      await page.selectOption('select[name="skillType3"]', { label: ml.skillType });
      await settle(page, 1500);
    }

    await setNativeInputValue(page, 'input[name="Date"]', entry.date);
    await page.waitForTimeout(300);

    switch (entry.type) {
      case 'Grand round/ clinical meeting presentations':
        await setNativeTextareaValue(page, 'textarea[name="Brief description of the case/topic"]', (entry as GrandRoundEntry).description);
        break;
      case 'Journal club presentation':
        await setNativeTextareaValue(page, 'textarea[name="Full reference of the article presented with abstract"]', (entry as JournalClubEntry).reference);
        break;
      case 'Mortality/Morbidity meeting presentations/Clinical audit':
        await setNativeTextareaValue(page, 'textarea[name="Brief description of the case presented"]', (entry as MortalityEntry).description);
        break;
      case 'Tutorials/small group teaching attended': {
        const t = entry as TutorialEntry;
        await setNativeInputValue(page, 'input[name="Topic"]', t.topic);
        await setNativeInputValue(page, 'input[name="Tutor/Supervisor"]', t.tutor);
        break;
      }
      case 'Other Lectures attended': {
        const o = entry as OtherLectureEntry;
        await setNativeInputValue(page, 'input[name="Topic"]', o.topic);
        await setNativeInputValue(page, 'input[name="Lecturer"]', o.lecturer);
        break;
      }
      case 'Mandatory Lectures attended': {
        const m = entry as MandatoryLectureEntry;
        await setNativeInputValue(page, 'input[name="Venue"]', m.venue);
        await setNativeInputValue(page, 'input[name="Speaker/Presenter"]', m.speaker);
        break;
      }
    }

    await page.waitForTimeout(500);

    const saveDraftBtn = page.locator('button:has-text("Save as Draft")').first();
    if ((await saveDraftBtn.count()) === 0) {
      return { ok: false, error: 'Save as Draft button not found' };
    }
    await saveDraftBtn.click();
    await settle(page, 3000);

    const bodyText: string = await page.locator('body').innerText().catch(() => '');
    if (/success|saved/i.test(bodyText.slice(0, 2000))) {
      return { ok: true };
    }

    return { ok: false, error: 'No success indicator after saving' };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

async function main() {
  const EXECUTE = process.argv.includes('--execute');
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  logger.info(`=== Academic Activities 2nd 2nd Upload: ${EXECUTE ? 'EXECUTE' : 'DRY-RUN'} ===`);
  logger.info(`Total entries: ${ENTRIES.length}, Skipping: [${[...SKIP_INDICES].join(', ')}]`);

  const toProcess = ENTRIES.map((e, i) => ({ entry: e, index: i }))
    .filter(({ index }) => !SKIP_INDICES.has(index));

  logger.info(`Will process ${toProcess.length} entries.`);

  if (!EXECUTE) {
    for (const { entry, index } of toProcess) {
      logger.info(`  [${index}] ${entry.type} | ${entry.date}`);
    }
    logger.info('Dry-run complete. Pass --execute to upload.');
    return;
  }

  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: false });
  const page = await context.newPage();

  let successCount = 0;
  let failCount = 0;
  let consecutiveFailures = 0;

  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) {
      logger.error('Login failed.');
      process.exit(1);
    }
    logger.info('Login confirmed.');

    for (const { entry, index } of toProcess) {
      logger.info(`[${index + 1}/${ENTRIES.length}] ${entry.type} | ${entry.date}`);

      const result = await fillEntry(page, entry);

      if (result.ok) {
        successCount++;
        consecutiveFailures = 0;
        logger.info(`  -> SUCCESS`);
      } else {
        failCount++;
        consecutiveFailures++;
        logger.error(`  -> FAILED: ${result.error}`);
        const ss = path.join(SCREENSHOTS_DIR, `fail-${index}-${Date.now()}.png`);
        await page.screenshot({ path: ss, fullPage: true }).catch(() => {});
      }

      if (consecutiveFailures >= 3) {
        logger.error('3 consecutive failures - stopping.');
        break;
      }
    }
  } finally {
    await browser.close();
  }

  logger.info(`=== DONE: ${successCount} succeeded, ${failCount} failed ===`);
}

main().catch((err) => {
  logger.error(`Crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
