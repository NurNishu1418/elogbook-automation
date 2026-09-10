import { launchBrowser, newContext } from '../utils/browser';
import { login } from '../auth/login';
import { logger } from '../utils/logger';

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();
  try {
    const result = await login(page);
    if (result.success) {
      logger.info('LOGIN CHECK: SUCCESS');
    } else {
      logger.error(`LOGIN CHECK: FAILED - ${result.reason}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`login-check crashed: ${err?.message ?? err}`);
  process.exit(1);
});
