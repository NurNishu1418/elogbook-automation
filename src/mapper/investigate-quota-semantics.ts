/**
 * READ-ONLY investigation: finds where (if anywhere) the portal displays
 * per-skill required/target counts to the trainee, to determine whether
 * log_entry_target.min_value values across multiple competence levels are
 * meant to be summed into one skill-level total, or are independent,
 * level-specific targets. Never modifies anything - GET requests and page
 * navigation only.
 */
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext, settle } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { authGet } from '../mapper/api';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  const loginResult = await ensureLoggedIn(page);
  if (!loginResult.success) {
    logger.error(`Login failed: ${loginResult.reason}`);
    await browser.close();
    process.exit(1);
  }
  logger.info('Login confirmed (read-only investigation).');

  const menuResult = await authGet(page, `${env.baseUrl}/api/auth/access/v1/get-permission-wise-menu`);
  function collectUrls(menus: any[], acc: { name: string; url: string }[] = []) {
    for (const m of menus ?? []) {
      if (m.url) acc.push({ name: m.name, url: m.url });
      collectUrls(m.sub_menus, acc);
    }
    return acc;
  }
  const urls = collectUrls(menuResult.body?.data?.menus ?? []);
  const relevant = urls.filter((u) => /log ?book|requirement|target|progress|summary|report|track/i.test(u.name) || /log ?book|requirement|target|progress|summary|report|track/i.test(u.url));
  logger.info(`Candidate menu items: ${JSON.stringify(relevant, null, 2)}`);

  const outDir = path.resolve(__dirname, '..', '..', 'output');
  fs.writeFileSync(path.join(outDir, 'quota-investigation-menu.json'), JSON.stringify(urls, null, 2), 'utf-8');

  const captured: { url: string; status: number; body: string }[] = [];
  page.on('response', async (response) => {
    const req = response.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return;
    let body = '';
    try {
      body = await response.text();
    } catch {
      body = '';
    }
    captured.push({ url: response.url(), status: response.status(), body });
  });

  for (const candidate of relevant) {
    const url = candidate.url.startsWith('http') ? candidate.url : `${env.baseUrl}${candidate.url}`;
    try {
      logger.info(`Navigating (read-only) to "${candidate.name}" -> ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await settle(page, 2000);
      const title = await page.title();
      const bodyTextSample = (await page.locator('body').innerText().catch(() => '')).slice(0, 500);
      logger.info(`  title="${title}"`);
      logger.info(`  body sample: ${bodyTextSample.replace(/\s+/g, ' ')}`);
    } catch (err: any) {
      logger.info(`  Could not load: ${err?.message ?? err}`);
    }
  }

  fs.writeFileSync(path.join(outDir, 'quota-investigation-network.json'), JSON.stringify(captured, null, 2), 'utf-8');
  logger.info(`Captured ${captured.length} XHR/fetch calls across candidate pages.`);
  captured.forEach((c) => logger.info(`  ${c.status} ${c.url}`));

  await browser.close();
}

main().catch((err) => {
  logger.error(`investigate-quota-semantics crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
