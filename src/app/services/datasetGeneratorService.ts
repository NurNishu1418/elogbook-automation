import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { listGeneratorSpecialties } from './workbookScanner';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const TS_NODE_BIN = path.join(PROJECT_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node');

let generatorRunning = false;

export function isGeneratorRunning(): boolean {
  return generatorRunning;
}

export function listSpecialties() {
  return listGeneratorSpecialties().map((s) => ({
    specialty: s.specialty,
    hasGenerator: fs.existsSync(s.scriptPath),
    outputFolder: s.outputFolder,
  }));
}

/**
 * Spawns the existing, unmodified dataset generator script for a specialty.
 * The script itself never opens a browser and never uploads anything - it
 * only writes a workbook + JSON reports and stops. This wrapper just runs
 * it and reports when it's done.
 */
export function runGenerator(specialty: string): Promise<{ success: boolean; output: string }> {
  const spec = listGeneratorSpecialties().find((s) => s.specialty === specialty);
  if (!spec) return Promise.resolve({ success: false, output: `Unknown specialty "${specialty}".` });
  if (!fs.existsSync(spec.scriptPath)) {
    return Promise.resolve({ success: false, output: `No generator script exists yet for "${specialty}". Add one under src/uploader/ following the Basic Surgical Skill pattern.` });
  }
  if (generatorRunning) return Promise.resolve({ success: false, output: 'A dataset generation is already running.' });

  generatorRunning = true;
  return new Promise((resolve) => {
    const proc = spawn(TS_NODE_BIN, [spec.scriptPath], { cwd: PROJECT_ROOT, windowsHide: true });
    let output = '';
    proc.stdout.on('data', (d) => (output += d.toString()));
    proc.stderr.on('data', (d) => (output += d.toString()));
    proc.on('exit', (code) => {
      generatorRunning = false;
      resolve({ success: code === 0, output });
    });
  });
}
