import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

export interface WorkbookInfo {
  path: string;
  relativePath: string;
  specialty: string;
  sizeBytes: number;
  modifiedAt: string;
}

function walk(dir: string, found: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.xlsx') && !entry.name.startsWith('~$')) {
      found.push(full);
    }
  }
}

/**
 * Scans generated-data/** and output/ for any .xlsx that actually has the
 * DataEntry + UploadResult sheet structure this project's uploader expects
 * - never hardcoded to one specialty.
 */
export async function scanWorkbooks(): Promise<WorkbookInfo[]> {
  const roots = [path.join(PROJECT_ROOT, 'generated-data'), path.join(PROJECT_ROOT, 'output')];
  const candidates: string[] = [];
  for (const root of roots) {
    if (fs.existsSync(root)) walk(root, candidates);
  }

  const compatible: WorkbookInfo[] = [];
  for (const p of candidates) {
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(p);
      if (wb.getWorksheet('DataEntry') && wb.getWorksheet('UploadResult')) {
        const stat = fs.statSync(p);
        compatible.push({
          path: p,
          relativePath: path.relative(PROJECT_ROOT, p),
          specialty: path.basename(path.dirname(p)),
          sizeBytes: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        });
      }
    } catch {
      // Not a readable/compatible workbook - skip it silently.
    }
  }
  return compatible.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

/** Known dataset-generator specialties (scripts that exist today). */
export function listGeneratorSpecialties(): { specialty: string; scriptPath: string; outputFolder: string }[] {
  return [
    {
      specialty: 'Basic Surgical Skill',
      scriptPath: path.join(PROJECT_ROOT, 'src', 'uploader', 'generate-basic-surgical-skill-dataset.ts'),
      outputFolder: path.join(PROJECT_ROOT, 'generated-data', 'Basic-Surgical-Skill'),
    },
  ];
}
