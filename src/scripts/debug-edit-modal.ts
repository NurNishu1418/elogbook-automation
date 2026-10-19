/**
 * Debug: open one Edit modal and inspect what inputs exist
 */
import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

const LIST_URL = 'https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1791367765318';

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login
  await page.goto('https://eportal.bcps.edu.bd/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const sel = await page.$('select[name="login_type"]');
  if (sel) await page.selectOption('select[name="login_type"]', { label: process.env.BCPS_USER_TYPE || 'Trainee' });
  await page.waitForTimeout(500);
  await page.fill('input[name="username"]', process.env.BCPS_USERNAME!);
  await page.fill('input[name="password"]', process.env.BCPS_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('Logged in:', page.url());

  await page.goto(LIST_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Click first Edit button
  const editBtn = page.locator('button:has-text("Edit")').first();
  if (await editBtn.isVisible().catch(() => false)) {
    await editBtn.click();
    await page.waitForTimeout(3000);

    // List all inputs in the modal/page
    const inputs = await page.evaluate(() => {
      const result: any[] = [];
      document.querySelectorAll('input, textarea, select').forEach((el: any) => {
        result.push({
          tag: el.tagName,
          type: el.type || '',
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          value: el.value || '',
          visible: el.offsetParent !== null,
        });
      });
      return result;
    });
    console.log('All form fields:');
    inputs.filter(i => i.visible).forEach(i => {
      console.log(`  ${i.tag} name="${i.name}" type="${i.type}" id="${i.id}" value="${i.value}" placeholder="${i.placeholder}"`);
    });

    // Also check buttons
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).filter(b => (b as HTMLElement).offsetParent !== null).map(b => ({
        text: (b as HTMLElement).innerText.trim().substring(0, 50),
        type: b.type,
      }));
    });
    console.log('Visible buttons:', buttons);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/edit-modal-debug.png', fullPage: true });
    console.log('Screenshot saved to screenshots/edit-modal-debug.png');
  }

  // Keep browser open for 30 seconds so user can see
  await page.waitForTimeout(30000);
  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
