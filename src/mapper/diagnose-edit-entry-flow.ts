/**
 * READ-ONLY diagnostic: discovers how to open an existing logbook entry for
 * editing (URL pattern, DOM flow). Navigates via the portal's own nav menu
 * (never guesses a URL) to find the logbook entry list, then locates the
 * specific canary entry (Patient Reg No 8128/65, "Administration of
 * nasogastric / nasojejunal feeding", Procedural Nutrition) and inspects
 * its row for an Edit action - WITHOUT changing or saving anything.
 */
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { logger } from '../utils/logger';
import { env } from '../utils/env';

const CANARY_REG_NO = '8128/65';

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
    logger.info('Login confirmed (read-only diagnostic).');
    logger.info(`Landed on: ${page.url()}`);

    // Discover navigation links on the dashboard/sidebar - look for
    // anything mentioning "logbook" to find the entry LIST page (not the
    // "add" form).
    const navLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map((a) => ({ text: (a.textContent || '').trim(), href: (a as HTMLAnchorElement).href }))
        .filter((l) => l.href.toLowerCase().includes('logbook') || l.text.toLowerCase().includes('logbook'))
    );
    logger.info(`Nav links mentioning "logbook": ${JSON.stringify(navLinks, null, 2)}`);

    // Try the most likely "list" link (not "/add").
    const listLink = navLinks.find((l) => l.text === 'Logbook Entry List') ?? navLinks.find((l) => !l.href.includes('/add') && l.href !== `${env.baseUrl}/`);
    if (!listLink) {
      logger.error('No logbook list link found in nav. Stopping - will not guess a URL.');
      return;
    }
    logger.info(`Navigating to discovered list page: ${listLink.href}`);
    await page.goto(listLink.href, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    logger.info(`Landed on: ${page.url()}`);

    // This page has a filter form: Form / From Date / To Date / Status.
    // Select the Form we care about and search, then scan the results.
    const formSelect = page.locator('select').first();
    await formSelect.selectOption({ label: 'Procedural and Interpretative Skills' }).catch(() => {});
    await page.waitForTimeout(500);

    // Filter to Status=Draft specifically - "Pending" entries only show a
    // "View" action (already submitted for review), while true Drafts
    // should be the ones offering an "Edit" action.
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption({ label: 'Draft' }).catch(() => {});
    await page.waitForTimeout(500);

    const searchButton = page.locator('button:has-text("Search")').first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
      await page.waitForTimeout(1500);
    }

    const bodyTextSample = (await page.locator('body').innerText().catch(() => '')).slice(0, 2000);
    logger.info(`Page body text sample after filtering: ${bodyTextSample}`);

    const pageHasRegNo = await page.locator(`text=${CANARY_REG_NO}`).count();
    logger.info(`Occurrences of canary Reg No "${CANARY_REG_NO}" visible on this page (page 1): ${pageHasRegNo}`);

    // Inspect any element that looks like an "Edit" action, including icon
    // buttons (many admin UIs use icon-only buttons/links with no visible
    // text - look at class names and title/aria-label too).
    const editLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a, button, i, svg'))
        .map((el) => ({
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 40),
          href: (el as HTMLAnchorElement).href ?? null,
          title: el.getAttribute('title'),
          ariaLabel: el.getAttribute('aria-label'),
          classList: el.className?.toString?.() ?? '',
        }))
        .filter((l) => /edit|pencil|update/i.test(l.text) || /edit|pencil|update/i.test(l.title ?? '') || /edit|pencil|update/i.test(l.ariaLabel ?? '') || /edit|pencil|update/i.test(l.classList ?? ''))
    );
    logger.info(`Elements that look like "Edit" actions on this page (first 15): ${JSON.stringify(editLinks.slice(0, 15), null, 2)}`);

    // Also dump the first table row's full HTML for structural context, if any table exists.
    const firstRowHtml = await page.evaluate(() => {
      const row = document.querySelector('table tbody tr');
      return row ? row.outerHTML.slice(0, 1500) : null;
    });
    logger.info(`First table row HTML (if any): ${firstRowHtml}`);

    // The grid isn't a semantic <table> (no tbody/tr matched) - find the
    // row container generically by locating the visible date text, then
    // walking up to the nearest ancestor that also contains an Edit button.
    const rowContainerInfo = await page.evaluate(() => {
      const allEls = Array.from(document.querySelectorAll('*'));
      const dateEl = allEls.find((el) => el.children.length === 0 && (el.textContent || '').includes('02/Apr/2026'));
      if (!dateEl) return { found: false, tag: null };
      let el: HTMLElement | null = dateEl as HTMLElement;
      for (let i = 0; i < 8 && el; i++) {
        if (el.textContent?.includes('Procedural Nutrition') && el.querySelector('button')) {
          return { found: true, tag: el.tagName, classList: el.className, depth: i };
        }
        el = el.parentElement;
      }
      return { found: false, tag: null };
    });
    logger.info(`Row container search result: ${JSON.stringify(rowContainerInfo)}`);

    const targetRow = page.locator(':has-text("02/Apr/2026"):has-text("Procedural Nutrition")').last();
    const targetRowCount = await targetRow.count();
    logger.info(`Locator-based target row count: ${targetRowCount}`);
    if (targetRowCount > 0) {
      const editButton = targetRow.locator('button:has-text("Edit")').first();
      await editButton.click();
      await page.waitForTimeout(2000);
      logger.info(`URL after clicking Edit: ${page.url()}`);

      const modalPresent = await page.locator('[class*="modal"]').count();
      logger.info(`Modal-like elements present: ${modalPresent}`);

      const editPageBodySample = (await page.locator('body').innerText().catch(() => '')).slice(0, 1500);
      logger.info(`Body text after clicking Edit: ${editPageBodySample}`);

      // Check whether the canary's actual data (Reg No, checked skill) is visible now.
      const regNoVisible = await page.locator(`text=${CANARY_REG_NO}`).count();
      logger.info(`Canary Reg No "${CANARY_REG_NO}" visible after opening Edit: ${regNoVisible}`);

      // Inspect checkboxes present in this edit view (read-only inspection only).
      const checkboxState = await page.evaluate(() => {
        const boxes = Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
        return boxes.map((b) => ({ name: b.getAttribute('name'), checked: b.checked }));
      });
      logger.info(`Checkbox states in Edit view: ${JSON.stringify(checkboxState, null, 2)}`);

      const saveButtons = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter(Boolean)
      );
      logger.info(`All button labels visible in Edit view (to identify the Update action WITHOUT clicking it): ${JSON.stringify(saveButtons)}`);

      // Safely back out WITHOUT saving anything - click Close, not Save as
      // Draft or Submit, to leave this existing draft untouched.
      const closeButton = page.locator('button:has-text("Close")').last();
      if ((await closeButton.count()) > 0) {
        await closeButton.click();
        await page.waitForTimeout(500);
        logger.info('Clicked "Close" to exit the Edit modal WITHOUT saving. Draft left unchanged.');
      } else {
        logger.warn('No "Close" button found - navigating away instead to discard any in-memory changes without saving.');
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`diagnose-edit-entry-flow crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
