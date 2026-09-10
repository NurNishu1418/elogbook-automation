/**
 * AGENT 2 - Phase 3 (source/mapping inventory) and Phase 25 (report set).
 * Pure local file analysis - zero portal contact, zero browser launch.
 * No genuine case data has been supplied, so every clinical/transform
 * report here honestly reports zero rows rather than fabricating any.
 */
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'generated-data', '2026-09-10', 'reports');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, file), 'utf-8'));
}

function findPdfsRecursive(dir: string, exclude: string[]): string[] {
  const results: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    if (exclude.some((ex) => current.includes(ex))) continue;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(current, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name.toLowerCase().endsWith('.pdf')) results.push(full);
    }
  }
  return results;
}

async function main() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  // ---- source-inventory.json ----
  const pdfs = findPdfsRecursive(PROJECT_ROOT, ['node_modules', '.git']);
  const sourceInventory = {
    generatedAt: new Date().toISOString(),
    pdfFilesFoundOnDisk: pdfs.length,
    pdfPaths: pdfs,
    note:
      pdfs.length === 0
        ? 'No BCPS source PDF files exist anywhere in this project directory. Specialty skill/count/level specifications used earlier in this project were supplied as pasted chat text, not as retained files - there is no local PDF to re-inspect for this run. The supplied FCPS/BCPS logbook style guidance from this conversation was used only as a style reference where explicitly given, never as a source of clinical facts.'
        : 'PDF files found - see pdfPaths.',
    fcpsLogbookStyleGuideAvailable: true,
    fcpsLogbookStyleGuideSource: 'Supplied inline in conversation (style/wording reference only, never a source of genuine case facts).',
  };
  fs.writeFileSync(path.join(REPORTS_DIR, 'source-inventory.json'), JSON.stringify(sourceInventory, null, 2), 'utf-8');

  // ---- mapping-inventory.json ----
  const formMap = readJson('form-map.json');
  const dependencyGraph = readJson('dependency-graph.json');
  const dropdownOptions = readJson('dropdown-options.json');
  const combinationPaths = readJson('combination-paths.json');
  const fields = readJson('fields.json');
  const lookups = readJson('lookups.json');

  const leaves = formMap.leaves ?? [];
  const bySpecialty: Record<string, { skillTypes: Set<string>; leafCount: number; competencyItemCount: number }> = {};
  for (const leaf of leaves) {
    const caseType = leaf.pathLabels?.[1] ?? 'UNKNOWN';
    const skillType = leaf.pathLabels?.[2] ?? 'UNKNOWN';
    if (!bySpecialty[caseType]) bySpecialty[caseType] = { skillTypes: new Set(), leafCount: 0, competencyItemCount: 0 };
    bySpecialty[caseType].skillTypes.add(skillType);
    bySpecialty[caseType].leafCount++;
    bySpecialty[caseType].competencyItemCount += (leaf.competencyGroup ?? []).length;
  }
  const mappingInventory = {
    generatedAt: new Date().toISOString(),
    totalLeavesInFormMap: leaves.length,
    sourceFilesRead: {
      'form-map.json': `${leaves.length} leaves`,
      'dependency-graph.json': `${Array.isArray(dependencyGraph) ? dependencyGraph.length : Object.keys(dependencyGraph).length} entries`,
      'dropdown-options.json': `${Array.isArray(dropdownOptions) ? dropdownOptions.length : Object.keys(dropdownOptions).length} entries`,
      'combination-paths.json': `${Array.isArray(combinationPaths) ? combinationPaths.length : Object.keys(combinationPaths).length} entries`,
      'fields.json': `${Array.isArray(fields) ? fields.length : Object.keys(fields).length} entries`,
      'lookups.json': `${Array.isArray(lookups) ? lookups.length : Object.keys(lookups).length} entries`,
    },
    bySpecialty: Object.fromEntries(
      Object.entries(bySpecialty).map(([k, v]) => [k, { skillTypes: [...v.skillTypes], leafCount: v.leafCount, competencyItemCount: v.competencyItemCount }])
    ),
    knownExceptions: [
      'Vascular Surgery: selecting it as Case Type silently loads Thoracic and Cardiovascular Surgery\'s schema instead - a confirmed live portal/frontend bug. Never routed around; new Vascular rows are held (PORTAL_ROUTING_HOLD) until proven fixed.',
      'Abdominal Wall > "Open and laparoscopic repair of inguinal hernia" maps to competency level "5", which has no corresponding portal checkbox (only Level 1-4 controls exist) - held as LEVEL5_PORTAL_HOLD, never substituted with Level 4.',
      'Nested Procedural "Level" checkboxes use fixed global DOM names (levelOne..levelFour) regardless of which skill is checked - validity is enforced only by mapped source data, not by the DOM itself.',
      'Some competency labels carry live portal typos/quirks (e.g. "Exposure, antiseptic washand draping" missing a space; trailing spaces on some Basic Surgical Skill items) - must be matched exactly as mapped, never silently normalized.',
    ],
  };
  fs.writeFileSync(path.join(REPORTS_DIR, 'mapping-inventory.json'), JSON.stringify(mappingInventory, null, 2), 'utf-8');

  // ---- validation-summary.json / clinical-coherence-review.json /
  // competency-level-review.json / hold-for-review.json / duplicate-review.json ----
  const zeroRowsNote = 'No genuine case data has been supplied for this run (Phase 4 requires genuine source case information; none was provided). Zero rows were transformed, so this report is intentionally empty rather than fabricated.';

  fs.writeFileSync(
    path.join(REPORTS_DIR, 'validation-summary.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        genuineCaseRowsReceived: 0,
        rowsTransformed: 0,
        uploadReadyRows: 0,
        heldRows: 0,
        note: zeroRowsNote,
      },
      null,
      2
    ),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(REPORTS_DIR, 'clinical-coherence-review.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), rowsReviewed: 0, coherenceFailures: 0, note: zeroRowsNote }, null, 2),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(REPORTS_DIR, 'competency-level-review.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        deterministicSingleLevelSkills: 0,
        humanLevelDecisionRequired: 0,
        level5PortalHolds: 0,
        note: zeroRowsNote,
      },
      null,
      2
    ),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(REPORTS_DIR, 'hold-for-review.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), totalHeld: 0, reasons: {}, note: zeroRowsNote }, null, 2),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(REPORTS_DIR, 'duplicate-review.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), duplicateExternalRowId: 0, duplicatePatientRegNo: 0, duplicateCaseCombinations: 0, note: zeroRowsNote }, null, 2),
    'utf-8'
  );

  // ---- upload-readiness-report.md ----
  const md = `# BCPS Auto-Data Upload Readiness Report - 2026-09-10

## Status: NOT READY - awaiting genuine source case data

This run built the blank Master auto-data template, 18 blank specialty workbooks (all sharing
the exact 13-column DataEntry schema), and a full source/mapping inventory. **No genuine case
data was supplied**, so per the explicit "do not fabricate clinical data" rule, zero rows were
transformed and zero rows are upload-ready.

## What was completed
- Blank master template: \`Master-All-Surgical-Skills/BCPS_Auto_Data_Blank_Template_2026-09-10.xlsx\`
- Master workbook shell (0 rows): \`Master-All-Surgical-Skills/BCPS_Master_All_Surgical_Skills_2026-09-10.xlsx\`
- 18 blank specialty workbooks, one per specialty folder, same 13-column schema
- Mapping inventory across all 6 existing mapping files (form-map, dependency-graph, dropdown-options, combination-paths, fields, lookups)
- 0 BCPS source PDF files found anywhere in the project directory - none exist locally to re-inspect

## What is blocked
- Phases 4-24 (genuine case transformation, per-specialty DataEntry population, Master union) require
  real supplied case information (patient name, Reg No, DOB, Date of Assignment, genuine diagnosis/
  procedure/investigation content) that has not been provided in this conversation.
- No row was invented to fill this gap.

## Live-write status
- Zero portal writes, zero Save as Draft, zero Add Entry, zero Edit, zero Submit, zero Final Submit.
- No uploader dry-run/preflight was run, since this session may share a browser/session with concurrent
  Basic Surgical Skill repair work - deferred per explicit instruction rather than risking interference.

## Next step
Supply genuine case data (per specialty, per skill) for transformation to proceed.
`;
  fs.writeFileSync(path.join(REPORTS_DIR, 'upload-readiness-report.md'), md, 'utf-8');

  console.log(`Reports written to ${REPORTS_DIR}`);
}

main().catch((err) => {
  console.error('generate-reports-2026-09-10 crashed:', err);
  process.exit(1);
});
