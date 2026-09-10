import fs from 'fs';
import path from 'path';

const CHECKPOINT_DIR = path.resolve(__dirname, '..', '..', 'checkpoints');

export function checkpointPath(name: string): string {
  return path.join(CHECKPOINT_DIR, `${name}.json`);
}

export function saveCheckpoint<T>(name: string, data: T): void {
  fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  const tmp = checkpointPath(name) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, checkpointPath(name));
}

export function loadCheckpoint<T>(name: string): T | null {
  const p = checkpointPath(name);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
  } catch {
    return null;
  }
}
