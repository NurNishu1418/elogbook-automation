import winston from 'winston';
import path from 'path';
import { env } from './env';

// Defense-in-depth: strip anything that looks like it could be a credential
// value, even though callers must never pass credentials to the logger.
const SECRETS = [env.username, env.password].filter((s) => s && s.length > 0);

function redact(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  let out = input;
  for (const secret of SECRETS) {
    if (secret) out = out.split(secret).join('[REDACTED]');
  }
  return out;
}

const redactFormat = winston.format((info) => {
  info.message = redact(info.message) as string;
  if (typeof info.stack === 'string') info.stack = redact(info.stack) as string;
  return info;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(
    redactFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...rest }) => {
      const extra = Object.keys(rest).length ? ` ${JSON.stringify(redact(JSON.stringify(rest)) )}` : '';
      return `${timestamp} [${level.toUpperCase()}] ${message}${extra}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.resolve(__dirname, '..', '..', 'logs', 'combined.log') }),
    new winston.transports.File({ filename: path.resolve(__dirname, '..', '..', 'logs', 'errors.log'), level: 'error' }),
  ],
});
