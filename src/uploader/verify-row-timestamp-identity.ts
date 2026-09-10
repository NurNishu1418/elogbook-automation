/**
 * READ-ONLY verification: does the Logbook Entry list's displayed
 * "date - time" string correspond exactly to a specific API field
 * (created_at or updated_at) for each entry? If so, that string (which
 * includes seconds) can serve as a provably-unique row-match key, instead
 * of the ambiguous "date + case type" match that previously caused a
 * false match among 13 same-date rows. Never clicks Edit.
 */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { authGet } from '../mapper/api';
import { logger } from '../utils/logger';
import { env } from '../utils/env';

function formatApiTimestampAsPortalDisplay(iso: string): string {
  // API timestamps are UTC (e.g. "2026-09-07T09:11:24.000000Z"). The portal
  // displays local time - try both UTC and Dhaka (UTC+6) to see which
  // matches, rather than assuming.
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmt(date: Date): string {
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${day}/${month}/${year} - ${hours}:${minutes}:${seconds} ${ampm}`;
  }
  const utc = fmt(d);
  const dhaka = fmt(new Date(d.getTime() + 6 * 60 * 60 * 1000));
  return `UTC=${utc} | Dhaka(+6)=${dhaka}`;
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();
  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      return;
    }
    logger.info('Login confirmed (read-only).');

    // Fetch page 1 via the API (same page the UI would show first, default sort).
    const url = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=1&paginate_per_page=20`;
    const r = await authGet<{ success: boolean; data: { data: any[] } }>(page, url);
    const apiEntries = r.body.data.data;
    logger.info(`API page 1 returned ${apiEntries.length} entries. First 10 ids + timestamps:`);
    apiEntries.slice(0, 10).forEach((e: any) => {
      logger.info(`${e.id} | created_at=${e.created_at} | updated_at=${e.updated_at} | ${formatApiTimestampAsPortalDisplay(e.created_at)}`);
    });

    // Now render the UI list (Draft filter) and dump the row texts, to
    // compare against the above by eye.
    await page.goto(`${env.baseUrl}/trainee/logbook-entry`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const formSelect = page.locator('select').first();
    await formSelect.selectOption({ label: 'Procedural and Interpretative Skills' });
    await page.waitForTimeout(300);
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption({ label: 'Draft' });
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Search")').first().click();
    await page.locator('button:has-text("Edit")').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.waitForTimeout(800);

    const rows = await page.evaluate(() => {
      const editButtons = Array.from(document.querySelectorAll('button')).filter((b) => b.textContent?.trim() === 'Edit');
      return editButtons.map((btn) => {
        let el: HTMLElement | null = btn as unknown as HTMLElement;
        for (let i = 0; i < 6 && el; i++) el = el.parentElement;
        return el?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
      });
    });
    logger.info(`\nUI Draft-filtered rows (page 1):`);
    rows.forEach((rw) => logger.info(rw ?? 'null'));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`verify-row-timestamp-identity crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
