import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext } from '../../utils/browser';
import { login, LoginBlockedError } from '../../auth/login';
import { env } from '../../utils/env';
import { resolveSelection, ResolvedSelection } from './selectionPreview';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
// Spawning node_modules/.bin/ts-node.cmd directly throws "spawn EINVAL" on
// Windows with Node >=18.x/20.x/22.x (CVE-2024-27980 hardening: spawn()
// refuses to exec a .cmd/.bat file without shell:true). Spawning the actual
// node executable against ts-node's own JS entry point sidesteps the
// .cmd-on-Windows problem entirely - process.execPath is always a real .exe,
// safe to spawn directly on every platform, no shell needed.
const TS_NODE_ENTRY = path.join(PROJECT_ROOT, 'node_modules', 'ts-node', 'dist', 'bin.js');

interface ActiveJob {
  proc: ChildProcessWithoutNullStreams;
  workbookPath: string;
  startedAt: string;
  selectionMode: string;
  rangeStart: number | null;
  rangeEnd: number | null;
  resolvedSelection: ResolvedSelection;
  logs: string[];
}

let activeJob: ActiveJob | null = null;

export function isJobRunning(): boolean {
  return activeJob !== null;
}

export function getActiveJobInfo() {
  if (!activeJob) return null;
  return {
    workbookPath: activeJob.workbookPath,
    startedAt: activeJob.startedAt,
    selectionMode: activeJob.selectionMode,
    rangeStart: activeJob.rangeStart,
    rangeEnd: activeJob.rangeEnd,
    resolvedSelection: activeJob.resolvedSelection,
    logs: activeJob.logs.slice(-300),
  };
}

export interface StartUploadOptions {
  workbookPath: string;
  selectionMode: 'not-yet-uploaded' | 'all-valid' | 'selected' | 'range' | 'failed-only';
  selectedRowIds?: string[];
  rangeStart?: number;
  rangeEnd?: number;
  credentials: { username: string; password: string; userType: string };
}

function progressPath(workbookPath: string): string {
  const dir = path.dirname(workbookPath);
  const base = path.basename(workbookPath, '.xlsx');
  return path.join(dir, `${base}.progress.json`);
}

/**
 * Resets this workbook's progress.json to a fresh zeroed state for a NEW
 * job, stamped with the job's own metadata (workbook/range/mode/resolved
 * selection). Written synchronously BEFORE the child process is spawned so
 * the UI's very next poll (progress.html polls every 1.5s) sees this fresh
 * state immediately, instead of whatever an unrelated prior job left behind
 * on disk. run-workbook.ts's own writeProgress() calls take over and keep
 * updating processed/successful/failed/skipped/remaining/current* as the
 * job actually runs; this initial write only ever happens once, right here.
 */
function resetProgressForNewJob(workbookPath: string, selectionMode: string, rangeStart: number | null, rangeEnd: number | null, resolved: ResolvedSelection): void {
  fs.writeFileSync(
    progressPath(workbookPath),
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        done: false,
        jobStartedAt: new Date().toISOString(),
        workbookPath,
        selectionMode,
        rangeStart,
        rangeEnd,
        totalEligible: resolved.resolvedCount,
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        remaining: resolved.resolvedCount,
        currentExternalRowId: null,
        currentSkill: null,
        currentStatus: 'starting',
      },
      null,
      2
    ),
    'utf-8'
  );
}

/**
 * Resolves the exact row selection, fails BEFORE any login/browser if it
 * resolves to zero rows, resets this workbook's progress to a fresh
 * zeroed state, then spawns src/uploader/run-workbook.ts **with --execute**
 * as a child process. This function is the ONLY path in the app that can
 * create real portal drafts - it is exclusively the live "Save as Draft"
 * path (dry-run validation goes through the separate, non-spawning
 * runDryRun() / resolveSelection() functions, which never touch the
 * portal). --execute is therefore always appended here, unconditionally -
 * there is no dry-run branch inside this function to accidentally omit it
 * from, and no caller can invoke a live job without it.
 *
 * Credentials are passed via the child's environment only - never as CLI
 * args (which would be visible in a process listing) and never written to
 * any file.
 */
export async function startUploadJob(opts: StartUploadOptions): Promise<ResolvedSelection> {
  if (activeJob) throw new Error('A job is already running (concurrency 1 - wait for it to finish or stop it first).');

  const resolved = await resolveSelection({
    workbookPath: opts.workbookPath,
    selectionMode: opts.selectionMode,
    selectedRowIds: opts.selectedRowIds,
    rangeStart: opts.rangeStart,
    rangeEnd: opts.rangeEnd,
  });
  if (resolved.resolvedCount === 0) {
    throw new Error(
      `No eligible rows resolved for this selection (mode="${opts.selectionMode}"` +
        (opts.rangeStart != null || opts.rangeEnd != null ? `, range=${opts.rangeStart ?? ''}-${opts.rangeEnd ?? ''}` : '') +
        `). Nothing was started - no login was attempted.`
    );
  }

  resetProgressForNewJob(opts.workbookPath, opts.selectionMode, opts.rangeStart ?? null, opts.rangeEnd ?? null, resolved);

  const scriptPath = path.join(PROJECT_ROOT, 'src', 'uploader', 'run-workbook.ts');
  const childEnv = {
    ...process.env,
    // The app runs its own browser automation headless by default so no
    // stray Chromium window pops up during normal use (the CLI tools this
    // reuses still default to headed for developer debugging - this only
    // overrides it for processes the app itself spawns).
    HEADLESS: process.env.APP_FORCE_HEADED === 'true' ? 'false' : 'true',
    BCPS_USERNAME: opts.credentials.username,
    BCPS_PASSWORD: opts.credentials.password,
    BCPS_USER_TYPE: opts.credentials.userType,
    UPLOAD_WORKBOOK_PATH: opts.workbookPath,
    UPLOAD_SELECTION_MODE: opts.selectionMode,
    UPLOAD_SELECTED_ROW_IDS: (opts.selectedRowIds ?? []).join(','),
    UPLOAD_RANGE_START: opts.rangeStart != null ? String(opts.rangeStart) : '',
    UPLOAD_RANGE_END: opts.rangeEnd != null ? String(opts.rangeEnd) : '',
  };

  const proc = spawn(process.execPath, [TS_NODE_ENTRY, scriptPath, '--execute'], { cwd: PROJECT_ROOT, env: childEnv, windowsHide: true }) as ChildProcessWithoutNullStreams;
  activeJob = {
    proc,
    workbookPath: opts.workbookPath,
    startedAt: new Date().toISOString(),
    selectionMode: opts.selectionMode,
    rangeStart: opts.rangeStart ?? null,
    rangeEnd: opts.rangeEnd ?? null,
    resolvedSelection: resolved,
    logs: [],
  };

  proc.stdout.on('data', (d) => activeJob?.logs.push(d.toString()));
  proc.stderr.on('data', (d) => activeJob?.logs.push(d.toString()));
  proc.on('exit', () => {
    activeJob = null;
  });

  return resolved;
}

export function requestStop(workbookPath: string): void {
  const dir = path.dirname(workbookPath);
  const base = path.basename(workbookPath, '.xlsx');
  fs.writeFileSync(path.join(dir, `${base}.stop.flag`), 'stop-requested');
}

/**
 * Validates credentials by calling the existing, unmodified login() from
 * src/auth/login.ts DIRECTLY in-process - no spawn, no external command.
 * This is both the fix for the Windows spawn EINVAL bug (spawning a
 * .cmd file for a short one-shot check was never necessary) and faster
 * (skips a fresh ts-node compile + process start on every login attempt).
 *
 * login() itself reads its username/password/userType from the shared
 * `env` object (src/utils/env.ts) - it has no parameter to override them,
 * and is not modified here. To use the UI-supplied credentials instead of
 * whatever is in .env, we set env's fields immediately before calling it.
 * This is a plain mutation of an already-exported, already-mutable config
 * object from the caller side - login.ts's own code and behaviour are
 * untouched. The values live only in this server process's memory; they
 * are never logged, written to disk, or included in any response.
 */
export async function checkLogin(credentials: { username: string; password: string; userType: string }): Promise<{ success: boolean; message: string }> {
  env.username = credentials.username;
  env.password = credentials.password;
  env.userType = credentials.userType;
  env.headless = process.env.APP_FORCE_HEADED === 'true' ? false : true;

  const browser = await launchBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();
  try {
    const result = await login(page);
    if (result.success) return { success: true, message: 'Login successful.' };
    return { success: false, message: result.reason || 'Login failed.' };
  } catch (err) {
    if (err instanceof LoginBlockedError) {
      return { success: false, message: `Blocked: ${err.message}` };
    }
    return { success: false, message: `Login error: ${(err as any)?.message ?? String(err)}` };
  } finally {
    await browser.close();
  }
}
