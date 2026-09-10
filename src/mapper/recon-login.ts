/**
 * One-off reconnaissance script: opens the live login page and dumps every
 * interactive element's structure (no credential values) to output/recon-login.json
 * so the real login selectors can be derived from live evidence, not guesses.
 */
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext, settle } from '../utils/browser';
import { scanAllFrames } from '../utils/domScan';
import { loginUrl } from '../utils/env';
import { logger } from '../utils/logger';

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();

  logger.info(`Navigating to login page: ${loginUrl()}`);
  await page.goto(loginUrl(), { waitUntil: 'domcontentloaded' });
  await settle(page, 1000);

  const title = await page.title();
  const url = page.url();
  const frames = await scanAllFrames(page);

  const outDir = path.resolve(__dirname, '..', '..', 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'recon-login.json');
  fs.writeFileSync(outPath, JSON.stringify({ title, url, frames }, null, 2), 'utf-8');

  logger.info(`Recon complete. Title="${title}" URL=${url} frames=${frames.length}`);
  logger.info(`Elements found in main frame: ${frames[0]?.elements.length ?? 0}`);
  logger.info(`Wrote ${outPath}`);

  await browser.close();
}

main().catch((err) => {
  logger.error(`recon-login failed: ${err?.message ?? err}`);
  process.exit(1);
});
