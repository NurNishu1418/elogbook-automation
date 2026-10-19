/**
 * Supervisor logbook approval — approve all pending entries for a trainee.
 *
 * Usage:
 *   npm run approve-drafts
 *
 * Reads BCPS_USERNAME / BCPS_PASSWORD / BCPS_USER_TYPE from .env.
 * Prompts for BMDC No., searches pending entries, shows count,
 * asks for explicit confirmation, then approves every entry with
 * live progress.
 */
import { Page } from 'playwright';
import * as readline from 'readline';
import { logger } from '../utils/logger';
import { launchBrowser, newContext, settle } from '../utils/browser';
import { login } from '../auth/login';
import { env } from '../utils/env';

const SUPERVISOR_URL = `${env.baseUrl}/supervisor/logbook?ref=1792313683083`;

function ask(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function ensureSupervisorLogin(page: Page): Promise<void> {
  await page.goto(SUPERVISOR_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(page, 1500);

  const onLogin = page.url().includes(env.loginPath) || (await page.$('input[name="password"]')) !== null;
  if (onLogin) {
    logger.info('Session expired or missing — logging in…');
    const result = await login(page);
    if (!result.success) {
      throw new Error(`Login failed: ${result.reason}`);
    }
    await page.goto(SUPERVISOR_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await settle(page, 2000);
  }
}

async function searchBMDC(page: Page, bmdcNo: string): Promise<number> {
  const bmdcInput = page.locator('input[name="bmdc_reg_no"]');
  await bmdcInput.waitFor({ state: 'visible', timeout: 30000 });
  await bmdcInput.fill(bmdcNo);

  const statusSel = page.locator('select[name="approved_status"]');
  await statusSel.waitFor({ state: 'visible', timeout: 10000 });
  await statusSel.selectOption('Pending');

  const searchBtn = page.locator('button:has-text("Search")');
  await searchBtn.waitFor({ state: 'visible', timeout: 10000 });
  await searchBtn.click();
  logger.info(`Searched BMDC: ${bmdcNo}, status: Pending`);

  for (let attempt = 0; attempt < 8; attempt++) {
    await page.waitForTimeout(2500);
    const count = await page.locator('button.btn-info').count();
    if (count > 0) return count;
  }
  return 0;
}

async function approveOne(page: Page, n: number): Promise<boolean> {
  try {
    const viewBtns = page.locator('button.btn-info');
    if ((await viewBtns.count()) === 0) return false;

    await viewBtns.first().click();
    await page.waitForTimeout(2500);

    await page.evaluate(() => {
      const modal = document.querySelector('.modal-body, .modal-content, [role="dialog"]');
      if (modal) {
        const el = document.getElementById('approve');
        if (el) el.scrollIntoView({ block: 'center' });
      }
    });
    await page.waitForTimeout(300);

    const radioOk = await page.evaluate(() => {
      const radio = document.getElementById('approve') as HTMLInputElement;
      if (!radio) return false;
      radio.click();
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });

    if (!radioOk) {
      logger.error(`  #${n}: Approve radio not found`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      return false;
    }

    await page.waitForTimeout(500);

    const updateOk = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (let i = 0; i < btns.length; i++) {
        const b = btns[i];
        const text = b.textContent?.trim() || '';
        if (text.includes('Update') && b.getBoundingClientRect().width > 0) {
          (b as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    if (!updateOk) {
      logger.error(`  #${n}: Update button not found`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      return false;
    }

    await page.waitForTimeout(2500);
    return true;
  } catch (err: any) {
    logger.error(`  #${n}: ${err.message?.substring(0, 100)}`);
    try { await page.keyboard.press('Escape'); } catch {}
    await page.waitForTimeout(1000);
    return false;
  }
}

async function main() {
  logger.info('=== Supervisor Logbook Approval ===');
  logger.info(`User: ${env.username} (${env.userType})`);

  const bmdcNo = await ask('Enter BMDC No.: ');
  if (!bmdcNo) {
    logger.info('No BMDC No. provided. Exiting.');
    return;
  }

  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: false });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);

  try {
    await ensureSupervisorLogin(page);
    logger.info('Supervisor logbook page loaded.');

    const pendingCount = await searchBMDC(page, bmdcNo);
    if (pendingCount === 0) {
      logger.info('No pending entries found for this BMDC No.');
      return;
    }

    logger.info(`Found ${pendingCount} pending entry/entries on this page.`);
    const confirm = await ask(`Approve all pending entries? (yes/no): `);
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      logger.info('Cancelled by user.');
      return;
    }

    let approved = 0;
    let failed = 0;
    let consecutiveFails = 0;

    while (consecutiveFails < 5) {
      const viewCount = await page.locator('button.btn-info').count();
      if (viewCount === 0) {
        await page.locator('button:has-text("Search")').click();
        await page.waitForTimeout(4000);
        if ((await page.locator('button.btn-info').count()) === 0) {
          logger.info('No more pending entries on this page.');
          break;
        }
      }

      const ok = await approveOne(page, approved + failed + 1);
      if (ok) {
        approved++;
        consecutiveFails = 0;
        logger.info(`  #${approved}: Approved  (${approved} done)`);
      } else {
        failed++;
        consecutiveFails++;
        logger.error(`  Failed attempt ${approved + failed}`);
      }
    }

    logger.info(`\n=== COMPLETE: ${approved} approved, ${failed} failed ===`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`Fatal: ${err?.stack ?? err}`);
  process.exit(1);
});
