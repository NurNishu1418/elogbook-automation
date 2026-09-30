import { logger } from '../utils/logger';
import { launchBrowser, newContext, settle } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { env } from '../utils/env';

const URL = `${env.baseUrl}/trainee/logbook/academic-activities/add`;

const TOPIC_TYPES = ['Surgical Oncology', 'Palliative Surgery', 'Professional behaviors', 'Trauma and Orthopaedics'];

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) { process.exit(1); }

    for (const topicType of TOPIC_TYPES) {
      await page.goto(URL, { waitUntil: 'domcontentloaded' });
      await settle(page, 1000);
      await page.selectOption('select[name="form"]', { label: 'Academic Activity' });
      await settle(page, 1000);
      await page.selectOption('select[name="skillType1"]', { label: 'Mandatory Lectures attended' });
      await settle(page, 1500);
      await page.selectOption('select[name="skillType2"]', { label: topicType });
      await settle(page, 1500);

      const options = await page.evaluate(() => {
        const sel = document.querySelector('select[name="skillType3"]') as HTMLSelectElement;
        if (!sel) return [];
        return Array.from(sel.options).filter(o => o.value).map(o => o.text.trim());
      });

      logger.info(`${topicType} => skillType3 options: ${JSON.stringify(options)}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch(err => { logger.error(err); process.exit(1); });
