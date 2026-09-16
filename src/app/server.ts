import express from 'express';
import path from 'path';
import { exec } from 'child_process';
import { setSession, clearSession, getPublicSession, getCredentialsForSpawn } from './services/session';
import { scanWorkbooks } from './services/workbookScanner';
import { runDryRun } from './services/dryRunService';
import { startUploadJob, requestStop, isJobRunning, getActiveJobInfo, checkLogin } from './services/jobRunner';
import { resolveSelection } from './services/selectionPreview';
import { readUploadResults, readProgress } from './services/resultsService';
import { listSpecialties, runGenerator, isGeneratorRunning } from './services/datasetGeneratorService';

const PORT = Number(process.env.APP_PORT ?? 4321);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Auth ----------
app.post('/api/login', async (req, res) => {
  const { username, password, userType } = req.body ?? {};
  if (!username || !password || !userType) {
    return res.status(400).json({ success: false, message: 'Username, password, and user type are all required.' });
  }
  try {
    const result = await checkLogin({ username, password, userType });
    if (result.success) setSession(username, password, userType);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message ?? String(err) });
  }
});

app.post('/api/logout', (_req, res) => {
  clearSession();
  res.json({ success: true });
});

app.get('/api/session', (_req, res) => {
  res.json(getPublicSession());
});

// ---------- Workbooks ----------
app.get('/api/workbooks', async (_req, res) => {
  try {
    const workbooks = await scanWorkbooks();
    res.json({ workbooks });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// ---------- Dry run ----------
app.post('/api/dry-run', async (req, res) => {
  const { workbookPath } = req.body ?? {};
  if (!workbookPath) return res.status(400).json({ error: 'workbookPath is required.' });
  try {
    const report = await runDryRun(workbookPath);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// ---------- Upload (Save as Draft only) ----------

// Pre-run confirmation: resolves EXACTLY which rows a given selection would
// touch (workbook, range, selection mode) using the same logic the live
// runner itself uses - local-only, no login, no browser. The UI calls this
// before showing the user a confirm dialog, so what they approve is exactly
// what will run.
app.post('/api/upload/preview', async (req, res) => {
  const { workbookPath, selectionMode, selectedRowIds, rangeStart, rangeEnd } = req.body ?? {};
  if (!workbookPath) return res.status(400).json({ error: 'workbookPath is required.' });
  try {
    const resolved = await resolveSelection({
      workbookPath,
      selectionMode: selectionMode ?? 'not-yet-uploaded',
      selectedRowIds,
      rangeStart,
      rangeEnd,
    });
    res.json(resolved);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
});

app.post('/api/upload/start', async (req, res) => {
  const session = getPublicSession();
  if (!session.loggedIn) return res.status(401).json({ error: 'Not logged in.' });
  if (isJobRunning()) return res.status(409).json({ error: 'A job is already running (concurrency 1).' });

  const { workbookPath, selectionMode, selectedRowIds, rangeStart, rangeEnd } = req.body ?? {};
  if (!workbookPath) return res.status(400).json({ error: 'workbookPath is required.' });

  try {
    const credentials = getCredentialsForSpawn();
    const resolved = await startUploadJob({
      workbookPath,
      selectionMode: selectionMode ?? 'not-yet-uploaded',
      selectedRowIds,
      rangeStart,
      rangeEnd,
      credentials,
    });
    res.json({ started: true, mode: 'LIVE - SAVE AS DRAFT', resolved });
  } catch (err: any) {
    // resolveSelection() throws BEFORE any login/browser is touched when
    // zero rows resolve - that error surfaces here as a normal 400, not a
    // crash, and no job was ever spawned.
    res.status(400).json({ error: err?.message ?? String(err) });
  }
});

app.post('/api/upload/stop', (req, res) => {
  const { workbookPath } = req.body ?? {};
  if (!workbookPath) return res.status(400).json({ error: 'workbookPath is required.' });
  requestStop(workbookPath);
  res.json({ stopRequested: true });
});

app.get('/api/upload/status', (req, res) => {
  const workbookPath = String(req.query.workbookPath ?? '');
  const running = isJobRunning();
  const jobInfo = getActiveJobInfo();
  const progress = workbookPath ? readProgress(workbookPath) : null;
  res.json({ running, jobInfo, progress });
});

// ---------- Results ----------
app.get('/api/results', async (req, res) => {
  const workbookPath = String(req.query.workbookPath ?? '');
  if (!workbookPath) return res.status(400).json({ error: 'workbookPath is required.' });
  try {
    const results = await readUploadResults(workbookPath);
    const progress = readProgress(workbookPath);
    res.json({ results, progress });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// ---------- Dataset generator ----------
app.get('/api/dataset/specialties', (_req, res) => {
  res.json({ specialties: listSpecialties(), running: isGeneratorRunning() });
});

app.post('/api/dataset/generate', async (req, res) => {
  const { specialty } = req.body ?? {};
  if (!specialty) return res.status(400).json({ error: 'specialty is required.' });
  const result = await runGenerator(specialty);
  res.json(result);
});

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`BCPS Automation app running at ${url}`);
  console.log('Save as Draft only. Final Submit is not supported anywhere in this app.');
  const openCmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(openCmd, () => {});
});
