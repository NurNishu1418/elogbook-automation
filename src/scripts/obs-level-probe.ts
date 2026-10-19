import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
dotenv.config();

async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 30 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const username = process.env.BCPS_USERNAME!;
  const password = process.env.BCPS_PASSWORD!;
  const userType = process.env.BCPS_USER_TYPE || 'Trainee';

  await page.goto('https://eportal.bcps.edu.bd/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(1500);
  const sel = await page.$('select[name="login_type"]');
  if (sel) await page.selectOption('select[name="login_type"]', { label: userType });
  await delay(500);
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await delay(2000);
  logger.info(`Login done. URL: ${page.url()}`);

  const ADD_URL = 'https://eportal.bcps.edu.bd/e-logbook/logbook-entry/add';

  const cases = [
    { form: 'Procedural and Interpretative Skills', caseType: 'Gynaecology & Counselling', skillType: null },
    { form: 'Procedural and Interpretative Skills', caseType: 'Obstetrics & Counselling', skillType: null },
  ];

  for (const c of cases) {
    logger.info(`\n=== Testing: ${c.caseType} > ${c.skillType} ===`);

    await page.goto(ADD_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);

    // Check what form options exist
    const formOptions = await page.evaluate(() => {
      const sel = document.querySelector('select[name="form"]') as HTMLSelectElement | null;
      if (!sel) return [];
      return Array.from(sel.options).map(o => o.text.trim()).filter(t => t);
    });
    logger.info(`  Form options: ${formOptions.join(', ')}`);

    await page.selectOption('select[name="form"]', { label: c.form });
    await delay(3000);

    // Check what's visible after form select
    const comboVisible = await page.locator('input[role="combobox"]').first().isVisible().catch(() => false);
    logger.info(`  Combobox visible after form select: ${comboVisible}`);

    // Also check for any select elements that appeared
    const allSelects = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('select')).map(s => ({
        name: s.name,
        options: Array.from(s.options).map(o => o.text.trim()).filter(t => t)
      }));
    });
    logger.info(`  All selects on page: ${JSON.stringify(allSelects)}`);

    if (!comboVisible) {
      // Try waiting longer
      const comboLater = await page.locator('input[role="combobox"]').first().isVisible({ timeout: 10000 }).catch(() => false);
      logger.info(`  Combobox visible after 10s wait: ${comboLater}`);
      if (!comboLater) {
        logger.error(`  Combobox still not visible, skipping`);
        continue;
      }
    }

    // React-select for CaseType
    const combo = page.locator('input[role="combobox"]').first();
    await combo.click();
    await delay(500);
    const options = page.locator('[id*="react-select"][id*="-option-"]');
    const available = await options.allTextContents();
    logger.info(`  Available CaseTypes: ${available.join(', ')}`);

    const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    const idx = available.findIndex(t => norm(t) === norm(c.caseType));
    if (idx === -1) {
      await page.keyboard.press('Escape').catch(() => {});
      continue;
    }
    await options.nth(idx).click();
    await delay(2000);

    // SkillType — discover what's available
    const skillPresent = await page.waitForSelector('select[name="skillType2"]', { timeout: 5000 }).then(() => true).catch(() => false);
    if (!skillPresent) {
      logger.info(`  No SkillType dropdown — checking for checkboxes directly`);
    } else {
      const skillOptions = await page.evaluate(() => {
        const sel = document.querySelector('select[name="skillType2"]') as HTMLSelectElement | null;
        if (!sel) return [];
        return Array.from(sel.options).map(o => o.text.trim()).filter(t => t && t !== 'Select...');
      });
      logger.info(`  SkillType options: ${skillOptions.join(', ')}`);
      if (c.skillType) {
        await page.selectOption('select[name="skillType2"]', { label: c.skillType });
      } else if (skillOptions.length > 0) {
        await page.selectOption('select[name="skillType2"]', { label: skillOptions[0] });
        logger.info(`  Auto-selected SkillType: ${skillOptions[0]}`);
      }
      await delay(2000);
    }

    // Competency checkbox — skip header/select-all checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    logger.info(`  Total checkboxes: ${count}`);
    if (count === 0) {
      logger.info(`  No competency checkboxes found`);
      continue;
    }

    // Log all checkbox names to understand the structure
    const allCbNames: string[] = [];
    for (let i = 0; i < Math.min(count, 8); i++) {
      const n = await checkboxes.nth(i).getAttribute('name');
      allCbNames.push(n ?? '(null)');
    }
    logger.info(`  Checkbox names: ${allCbNames.join(', ')}`);

    // Pick second checkbox (skip header if first is "Competency Group and Details" or similar)
    const targetIdx = allCbNames[0]?.includes('Competency Group') ? 1 : 0;
    if (targetIdx >= count) {
      logger.info(`  Only header checkbox, no real competency items`);
      continue;
    }
    const targetCb = checkboxes.nth(targetIdx);
    const cbName = await targetCb.getAttribute('name');
    logger.info(`  Clicking checkbox[${targetIdx}]: "${cbName}"`);
    await targetCb.check();
    await delay(2000);

    const l1 = await page.locator('input[name="levelOne"]').isVisible({ timeout: 2000 }).catch(() => false);
    const l2 = await page.locator('input[name="levelTwo"]').isVisible({ timeout: 500 }).catch(() => false);
    const l3 = await page.locator('input[name="levelThree"]').isVisible({ timeout: 500 }).catch(() => false);
    const l4 = await page.locator('input[name="levelFour"]').isVisible({ timeout: 500 }).catch(() => false);

    logger.info(`  Levels visible: L1=${l1}, L2=${l2}, L3=${l3}, L4=${l4}`);
    if (l1 || l2 || l3 || l4) {
      logger.info(`  >>> LEVEL REQUIRED for ${c.caseType} > ${c.skillType}`);
    } else {
      logger.info(`  >>> NO LEVEL for ${c.caseType} > ${c.skillType}`);
    }

    await targetCb.uncheck().catch(() => {});
    await delay(500);
  }

  await browser.close();
  logger.info('\nProbe complete.');
}

main().catch(err => { logger.error(`Crashed: ${err?.stack ?? err}`); process.exit(1); });
