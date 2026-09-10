import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  use: {
    headless: process.env.HEADLESS !== 'false',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
});
