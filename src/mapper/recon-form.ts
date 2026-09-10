/**
 * One-off reconnaissance script: logs in (reusing a saved session when
 * possible), opens the live Add Logbook Entry form, and dumps the initial
 * untouched state (all frames, all interactive elements) to
 * output/recon-form.json for inspection before building the full mapper.
 */
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext, settle } from '../utils/browser';
import { scanAllFrames } from '../utils/domScan';
import { ensureLoggedIn } from '../auth/login';
import { formUrl } from '../utils/env';
import { logger } from '../utils/logger';

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  const loginResult = await ensureLoggedIn(page);
  if (!loginResult.success) {
    logger.error(`Cannot reach form page, login failed: ${loginResult.reason}`);
    await browser.close();
    process.exit(1);
  }

  logger.info(`Navigating to form page: ${formUrl()}`);
  await page.goto(formUrl(), { waitUntil: 'domcontentloaded' });
  await settle(page, 1500);

  const title = await page.title();
  const url = page.url();
  const frames = await scanAllFrames(page);

  const bodyText = await page.locator('body').innerText().catch(() => '');
  const html = await page.content();

  const outDir = path.resolve(__dirname, '..', '..', 'output');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'recon-form.json'), JSON.stringify({ title, url, frames }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(outDir, 'recon-form.html'), html, 'utf-8');

  logger.info(`Recon complete. Title="${title}" URL=${url} frames=${frames.length}`);
  frames.forEach((f, i) => logger.info(`Frame[${i}] ${f.frameUrl} -> ${f.elements.length} elements`));
  logger.info(`Body text length: ${bodyText.length}`);

  await browser.close();
}

main().catch((err) => {
  logger.error(`recon-form failed: ${err?.message ?? err}`);
  process.exit(1);
});
