import { Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import { env, loginUrl, formUrl } from '../utils/env';
import { logger } from '../utils/logger';
import { settle, SESSION_STATE_PATH } from '../utils/browser';

export class LoginBlockedError extends Error {}

const USERNAME_SELECTOR = 'input[name="username"]';
const PASSWORD_SELECTOR = 'input[name="password"]';
const SUBMIT_SELECTOR = 'button[type="submit"]';
const DOCTOR_TYPE_SELECTOR = 'select[name="doctor_type"]';
const LOGIN_TYPE_SELECTOR = 'select[name="login_type"]';

async function selectOptionsOf(page: Page, selector: string): Promise<string[]> {
  const el = await page.$(selector);
  if (!el) return [];
  return el.evaluate((node) => Array.from((node as HTMLSelectElement).options).map((o) => o.value));
}

/**
 * BCPS_USER_TYPE in .env is a single role value, but the live form exposes
 * two independent selects (doctor_type: MBBS/BDS, login_type: Trainee/
 * Supervisor/Fellow). Rather than guessing which one it means, match the
 * configured value against each select's live option set and apply it to
 * whichever one actually contains it.
 */
async function applyUserType(page: Page): Promise<void> {
  const target = env.userType;
  const doctorOptions = await selectOptionsOf(page, DOCTOR_TYPE_SELECTOR);
  const loginOptions = await selectOptionsOf(page, LOGIN_TYPE_SELECTOR);

  const matchesDoctor = doctorOptions.some((o) => o.toLowerCase() === target.toLowerCase());
  const matchesLogin = loginOptions.some((o) => o.toLowerCase() === target.toLowerCase());

  if (!matchesDoctor && !matchesLogin) {
    throw new LoginBlockedError(
      `BCPS_USER_TYPE value does not match any option of doctor_type [${doctorOptions.join(', ')}] ` +
        `or login_type [${loginOptions.join(', ')}] on the live login form. Update .env to one of these option values.`
    );
  }
  if (matchesDoctor) {
    await page.selectOption(DOCTOR_TYPE_SELECTOR, { value: doctorOptions.find((o) => o.toLowerCase() === target.toLowerCase())! });
    logger.info('User type applied to doctor_type select.');
  }
  if (matchesLogin) {
    await page.selectOption(LOGIN_TYPE_SELECTOR, { value: loginOptions.find((o) => o.toLowerCase() === target.toLowerCase())! });
    logger.info('User type applied to login_type select.');
  }
}

export async function login(page: Page): Promise<{ success: boolean; reason?: string }> {
  logger.info(`Navigating to login page: ${loginUrl()}`);
  await page.goto(loginUrl(), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(page, 800);

  const captchaLike = await page.$('[class*="captcha" i], iframe[src*="recaptcha" i], iframe[src*="hcaptcha" i]');
  if (captchaLike) {
    throw new LoginBlockedError('CAPTCHA control detected on login page. Automation stopped per safety policy.');
  }

  const usernameField = await page.$(USERNAME_SELECTOR);
  const passwordField = await page.$(PASSWORD_SELECTOR);
  if (!usernameField || !passwordField) {
    throw new LoginBlockedError('Could not locate username/password fields on the live login page (portal markup may have changed).');
  }

  await applyUserType(page);
  await page.fill(USERNAME_SELECTOR, env.username);
  await page.fill(PASSWORD_SELECTOR, env.password);

  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    page.click(SUBMIT_SELECTOR),
  ]);
  await settle(page, 1000);

  const otpLike = await page.$('[name*="otp" i], [id*="otp" i], input[name*="2fa" i]');
  if (otpLike) {
    throw new LoginBlockedError('OTP / two-factor input detected after submitting login. Automation stopped per safety policy.');
  }

  const stillOnLogin = page.url().includes(env.loginPath) || (await page.$(PASSWORD_SELECTOR)) !== null;
  if (stillOnLogin) {
    const errorText = await page
      .locator('.alert, .invalid-feedback, .text-danger, [role="alert"]')
      .allTextContents()
      .catch(() => [] as string[]);
    const message = errorText.filter((t) => t.trim().length > 0).join(' | ');
    if (/locked|suspended|disabled/i.test(message)) {
      throw new LoginBlockedError(`Account restriction reported by portal: ${message}`);
    }
    return { success: false, reason: message || 'Login form re-rendered without navigating away; credentials likely rejected.' };
  }

  fs.mkdirSync(path.dirname(SESSION_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: SESSION_STATE_PATH });
  logger.info(`Login succeeded. Landed on: ${page.url()}`);
  return { success: true };
}

export async function ensureLoggedIn(page: Page): Promise<{ success: boolean; reason?: string }> {
  await page.goto(formUrl(), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(page, 800);
  const onLogin = page.url().includes(env.loginPath) || (await page.$(PASSWORD_SELECTOR)) !== null;
  if (!onLogin) {
    return { success: true };
  }
  logger.info('Session missing or expired; logging in again.');
  return login(page);
}
