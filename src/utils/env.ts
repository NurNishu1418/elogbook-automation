import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}. Check your .env file (see .env.example).`);
  }
  return v;
}

export const env = {
  baseUrl: required('BASE_URL').replace(/\/+$/, ''),
  loginPath: required('LOGIN_PATH'),
  formPath: required('FORM_PATH'),
  userType: required('BCPS_USER_TYPE'),
  username: required('BCPS_USERNAME'),
  password: required('BCPS_PASSWORD'),
  maxDepth: Number(process.env.MAX_DEPTH ?? '6'),
  maxOptionsPerField: Number(process.env.MAX_OPTIONS_PER_FIELD ?? '50'),
  headless: process.env.HEADLESS === 'true',
};

export function loginUrl(): string {
  return env.baseUrl + env.loginPath;
}

export function formUrl(): string {
  return env.baseUrl + env.formPath;
}
