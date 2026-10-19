import { chromium, Page } from 'playwright';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const BASE = process.env.BASE_URL || 'https://eportal.bcps.edu.bd';
const TARGET_URL = 'https://eportal.bcps.edu.bd/supervisor/logbook?ref=1792230050201';
const BMDC_NO = '118632';

async function approveOne(page: Page, n: number): Promise<boolean> {
  try {
    // Click first View button
    const viewBtns = page.locator('button.btn-info');
    const count = await viewBtns.count();
    if (count === 0) {
      console.log(`  #${n}: No View buttons`);
      return false;
    }

    await viewBtns.first().click();
    console.log(`  #${n}: View clicked, waiting modal...`);

    // Wait for modal to appear
    await page.waitForTimeout(2500);

    // Click Approve radio via JS
    const radioOk = await page.evaluate(() => {
      const radio = document.getElementById('approve') as HTMLInputElement;
      if (!radio) return 'no-radio';
      radio.click();
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      return 'ok';
    });

    if (radioOk !== 'ok') {
      console.log(`  #${n}: Approve radio failed: ${radioOk}`);
      // Try to close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      return false;
    }

    await page.waitForTimeout(500);

    // Click Update via JS
    const updateOk = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (let i = 0; i < btns.length; i++) {
        const b = btns[i];
        const text = b.textContent?.trim() || '';
        if (text.includes('Update')) {
          const rect = b.getBoundingClientRect();
          if (rect.width > 0) {
            (b as HTMLElement).click();
            return 'ok';
          }
        }
      }
      return 'no-update-btn';
    });

    if (updateOk !== 'ok') {
      console.log(`  #${n}: Update failed: ${updateOk}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      return false;
    }

    // Wait for modal to close and list to refresh
    await page.waitForTimeout(2500);
    console.log(`  #${n}: Approved!`);
    return true;
  } catch (err: any) {
    console.log(`  #${n}: Error: ${err.message?.substring(0, 80)}`);
    try { await page.keyboard.press('Escape'); } catch {}
    await page.waitForTimeout(1000);
    return false;
  }
}

async function main() {
  const sessPath = path.resolve(__dirname, '..', '..', 'sessions', 'storageState.json');
  const browser = await chromium.launch({ headless: false });
  const context = fs.existsSync(sessPath)
    ? await browser.newContext({ storageState: sessPath })
    : await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

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

  // Search
  await page.locator('input[name="bmdc_reg_no"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[name="bmdc_reg_no"]').fill(BMDC_NO);
  await page.locator('select[name="approved_status"]').selectOption('Pending');
  await page.locator('button:has-text("Search")').click();
  console.log('Searched BMDC:', BMDC_NO);
  await page.waitForTimeout(5000);

  let totalApproved = 0;
  let totalFailed = 0;
  let consecutiveFails = 0;

  while (consecutiveFails < 5) {
    const viewCount = await page.locator('button.btn-info').count();
    if (viewCount === 0) {
      console.log('No View buttons on page. Re-searching...');
      await page.locator('button:has-text("Search")').click();
      await page.waitForTimeout(5000);
      const newCount = await page.locator('button.btn-info').count();
      if (newCount === 0) {
        console.log('Still no entries. All done!');
        break;
      }
    }

    const ok = await approveOne(page, totalApproved + totalFailed + 1);
    if (ok) {
      totalApproved++;
      consecutiveFails = 0;
    } else {
      totalFailed++;
      consecutiveFails++;
    }

    if ((totalApproved + totalFailed) % 25 === 0) {
      console.log(`Progress: approved=${totalApproved} failed=${totalFailed}`);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Approved: ${totalApproved}`);
  console.log(`Failed: ${totalFailed}`);
  await page.screenshot({ path: 'generated-data/medicin/sup-all-done.png', fullPage: true });
  await browser.close();
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
