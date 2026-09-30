import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { launchBrowser, newContext, settle } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { env } from '../utils/env';

const ACADEMIC_ACTIVITIES_URL = `${env.baseUrl}/trainee/logbook/academic-activities/add`;
const ACADEMIC_ACTIVITIES_LIST_URL = `${env.baseUrl}/trainee/logbook/academic-activities`;
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', '..', 'screenshots', 'academic');

const ENTRY_1 = {
  systemType: 'Grand round/ clinical meeting presentations',
  date: '2026-01-21',
  description:
    '75 year old female diabetic hypertensive presented with left lower quadrant pain with decrease in caliber of stools. History of weight loss for last 6 months. Difficulty in defecation and occasional vomiting. On DRE, there is a palpable mass found 7-8cm from anal verge. The patient is now fit for general anesthesia and plan for abdominoperineal resection with permanent colostomy in left iliac fossa.',
};

async function setDateInputValue(page: any, selector: string, dateValue: string) {
  await page.evaluate(({ sel, val }: { sel: string; val: string }) => {
    const input = document.querySelector(sel) as HTMLInputElement;
    if (!input) throw new Error(`Date input not found: ${sel}`);
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )!.set!;
    nativeInputValueSetter.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { sel: selector, val: dateValue });
}

async function main() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      process.exit(1);
    }
    logger.info('Login confirmed.');

    // Go to the list page to find and edit the draft
    logger.info('Going to Academic Activities list to find the draft entry...');
    await page.goto(ACADEMIC_ACTIVITIES_LIST_URL, { waitUntil: 'domcontentloaded' });
    await settle(page, 2000);

    // Click the Edit button for the draft entry (row #1)
    const editBtn = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
    const hasEdit = (await editBtn.count()) > 0;

    if (hasEdit) {
      logger.info('Found Edit button, clicking it to edit the draft...');
      await editBtn.click();
      await settle(page, 2000);

      const screenshotEdit = path.join(SCREENSHOTS_DIR, 'edit-draft-page.png');
      await page.screenshot({ path: screenshotEdit, fullPage: true });
      logger.info(`Screenshot (edit page): ${screenshotEdit}`);

      // Dump the form to see what's there
      const formInfo = await page.evaluate(() => {
        const result: any[] = [];
        document.querySelectorAll('select, input, textarea').forEach((el) => {
          const rect = (el as HTMLElement).getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;
          const tag = el.tagName;
          const name = el.getAttribute('name') || '';
          const type = (el as HTMLInputElement).type || '';
          const value = (el as HTMLInputElement).value || '';
          result.push({ tag, name, type, value: value.substring(0, 200) });
        });
        return result;
      });
      logger.info('=== EDIT PAGE FORM CONTROLS ===');
      for (const ctrl of formInfo) {
        logger.info(JSON.stringify(ctrl));
      }

      // Set the date using native setter to trigger React
      logger.info(`Setting date to ${ENTRY_1.date} using native value setter...`);
      await setDateInputValue(page, 'input[name="Date"]', ENTRY_1.date);
      await page.waitForTimeout(500);

      // Verify the date was set
      const dateValue = await page.evaluate(() => {
        return (document.querySelector('input[name="Date"]') as HTMLInputElement)?.value;
      });
      logger.info(`Date field value after set: ${dateValue}`);

      const screenshotDateFixed = path.join(SCREENSHOTS_DIR, 'edit-date-fixed.png');
      await page.screenshot({ path: screenshotDateFixed, fullPage: true });

      // Click Save as Draft
      const saveDraftBtn = page.locator('button:has-text("Save as Draft")').first();
      const updateBtn = page.locator('button:has-text("Update")').first();

      if ((await saveDraftBtn.count()) > 0) {
        logger.info('Clicking "Save as Draft"...');
        await saveDraftBtn.click();
      } else if ((await updateBtn.count()) > 0) {
        logger.info('Clicking "Update"...');
        await updateBtn.click();
      } else {
        // Dump all buttons
        const buttons = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('button'))
            .filter((el) => el.getBoundingClientRect().width > 0)
            .map((el) => ({ text: el.textContent?.trim(), type: el.type }));
        });
        logger.info('Available buttons: ' + JSON.stringify(buttons));
      }

      await settle(page, 3000);

      const screenshotAfterUpdate = path.join(SCREENSHOTS_DIR, 'edit-after-update.png');
      await page.screenshot({ path: screenshotAfterUpdate, fullPage: true });
      logger.info(`Screenshot (after update): ${screenshotAfterUpdate}`);

      const bodyText = await page.locator('body').innerText().catch(() => '');
      logger.info(`Current URL: ${page.url()}`);
      logger.info(`Body (first 300 chars): ${bodyText.substring(0, 300)}`);
    } else {
      logger.error('No Edit button found. The draft may not exist.');
    }

  } catch (err: any) {
    logger.error(`Error: ${err?.stack ?? err}`);
    const errorScreenshot = path.join(SCREENSHOTS_DIR, `error-${Date.now()}.png`);
    await page.screenshot({ path: errorScreenshot, fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`Crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
