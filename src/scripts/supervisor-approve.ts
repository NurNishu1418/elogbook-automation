import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const BASE = process.env.BASE_URL || 'https://eportal.bcps.edu.bd';
const TARGET_URL = 'https://eportal.bcps.edu.bd/supervisor/logbook?ref=1792230050201';
const BMDC_NO = '118632';

async function main() {
  const sessPath = path.resolve(__dirname, '..', '..', 'sessions', 'storageState.json');
  const browser = await chromium.launch({ headless: false });
  const context = fs.existsSync(sessPath)
    ? await browser.newContext({ storageState: sessPath })
    : await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(90000);

  if (!fs.existsSync(sessPath)) {
    console.log('Logging in...');
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2000);
    const typeSelect = page.locator('select[name="login_type"], select#login_type');
    if (await typeSelect.count() > 0) {
      await typeSelect.selectOption({ label: process.env.BCPS_USER_TYPE || 'Supervisor' });
      await page.waitForTimeout(1000);
    }
    await page.fill('input[name="username"], input#username', process.env.BCPS_USERNAME!);
    await page.fill('input[name="password"], input#password', process.env.BCPS_PASSWORD!);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 90000 });
    console.log('Login success');
    await context.storageState({ path: sessPath });
  }

  console.log('Going to supervisor logbook...');
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'generated-data/medicin/sup-loaded.png', fullPage: true });
  console.log('Page loaded');

  // Fill BMDC
  const bmdcInput = page.locator('input[name="bmdc_reg_no"]');
  await bmdcInput.waitFor({ state: 'visible', timeout: 30000 });
  await bmdcInput.fill(BMDC_NO);
  console.log('BMDC filled');

  // Set status
  const statusSel = page.locator('select[name="approved_status"]');
  await statusSel.waitFor({ state: 'visible', timeout: 10000 });
  await statusSel.selectOption('Pending');
  console.log('Status: Pending');

  // Click Search
  const searchBtn = page.locator('button:has-text("Search")');
  await searchBtn.waitFor({ state: 'visible', timeout: 10000 });
  await searchBtn.click();
  console.log('Searched BMDC:', BMDC_NO);

  // Wait for results to load - try multiple times
  let viewFound = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.waitForTimeout(3000);
    const count = await page.locator('button.btn-info').count();
    console.log('Attempt', attempt + 1, '- btn-info count:', count);
    if (count > 0) {
      viewFound = true;
      break;
    }
  }

  if (!viewFound) {
    console.log('No results after waiting. Screenshot:');
    await page.screenshot({ path: 'generated-data/medicin/sup-no-results.png', fullPage: true });
    await browser.close();
    return;
  }

  // Click first View button
  await page.locator('button.btn-info').first().click();
  console.log('View clicked - waiting for modal...');
  await page.waitForTimeout(3000);

  // Scroll modal into view if needed
  await page.evaluate(() => {
    const modal = document.querySelector('.modal-body, .modal-content, [role="dialog"]');
    if (modal) {
      const approveEl = document.getElementById('approve');
      if (approveEl) approveEl.scrollIntoView({ block: 'center' });
    }
  });
  await page.waitForTimeout(500);

  // Click Approve radio using JavaScript (bypasses visibility check)
  const clicked = await page.evaluate(() => {
    const radio = document.getElementById('approve') as HTMLInputElement;
    if (radio) {
      radio.click();
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  });
  console.log('Approve radio clicked via JS:', clicked);

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'generated-data/medicin/sup-approve-selected.png' });

  // Find and click Update button
  // First check what buttons are visible in the modal area
  const btnInfo = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    const info: string[] = [];
    for (let i = 0; i < btns.length; i++) {
      const b = btns[i];
      const text = b.textContent?.trim() || '';
      const rect = b.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (text.includes('Update') || text.includes('Submit') || text.includes('Save'))) {
        info.push(`btn: "${text}" y=${Math.round(rect.y)} class="${b.className}"`);
      }
    }
    return info;
  });
  console.log('Action buttons:', btnInfo);

  // Try clicking Update via JS
  const updateClicked = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (let i = 0; i < btns.length; i++) { const b = btns[i];
      const text = b.textContent?.trim() || '';
      if (text === 'Update' || text.includes('Update')) {
        const rect = b.getBoundingClientRect();
        if (rect.width > 0) {
          (b as HTMLElement).click();
          return text;
        }
      }
    }
    return null;
  });
  console.log('Update clicked:', updateClicked);

  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'generated-data/medicin/sup-result.png', fullPage: true });
  console.log('Done!');
  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
