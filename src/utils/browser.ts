import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import { env } from './env';

export const SESSION_STATE_PATH = path.resolve(__dirname, '..', '..', 'sessions', 'storageState.json');

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: env.headless, slowMo: env.headless ? 0 : 50 });
}

export async function newContext(browser: Browser, opts: { useStoredSession?: boolean } = {}): Promise<BrowserContext> {
  const fs = await import('fs');
  const storageState = opts.useStoredSession && fs.existsSync(SESSION_STATE_PATH) ? SESSION_STATE_PATH : undefined;
  return browser.newContext({
    storageState,
    viewport: { width: 1440, height: 900 },
    acceptDownloads: false,
  });
}

export async function settle(page: Page, extraWaitMs = 400): Promise<void> {
  try {
    await page.waitForLoadState('domcontentloaded');
  } catch {
    /* ignore */
  }
  try {
    await page.waitForLoadState('networkidle', { timeout: 8000 });
  } catch {
    // Some portals keep long-poll/analytics connections open; a short grace
    // period is used instead of failing the whole crawl on this timeout.
  }
  await page.waitForTimeout(extraWaitMs);
}
