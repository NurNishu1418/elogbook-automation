import { Page } from 'playwright';

/**
 * Several controls on this portal (native <select> and react-select) load
 * their option list asynchronously after mount. A fixed sleep is unreliable
 * (observed race: 1500ms sometimes captures 1 option, sometimes 3). This
 * polls a probe function until its result stops changing for `quietMs`,
 * which is what actually reflects when the async load has settled.
 */
export async function waitForStable<T>(
  page: Page,
  probe: () => Promise<T>,
  opts: { timeoutMs?: number; quietMs?: number; intervalMs?: number; isEqual?: (a: T, b: T) => boolean } = {}
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 10000;
  const quietMs = opts.quietMs ?? 500;
  const intervalMs = opts.intervalMs ?? 200;
  const isEqual = opts.isEqual ?? ((a, b) => JSON.stringify(a) === JSON.stringify(b));

  const start = Date.now();
  let last = await probe();
  let lastChangeAt = Date.now();

  while (Date.now() - start < timeoutMs) {
    await page.waitForTimeout(intervalMs);
    const current = await probe();
    if (!isEqual(current, last)) {
      last = current;
      lastChangeAt = Date.now();
    } else if (Date.now() - lastChangeAt >= quietMs) {
      return current;
    }
  }
  return last;
}
