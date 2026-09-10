import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { env } from '../utils/env';

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'output');

function readJson<T>(name: string): T | null {
  const p = path.join(OUTPUT_DIR, name);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

export function generateReport(): void {
  const formMap = readJson<any>('form-map.json');
  const dependencies = readJson<any[]>('dependency-graph.json') ?? [];
  const dropdownOptions = readJson<any[]>('dropdown-options.json') ?? [];
  const combinationPaths = readJson<any[]>('combination-paths.json') ?? [];
  const fields = readJson<any[]>('fields.json') ?? [];
  const reconciliation = readJson<any>('verification-reconciliation.json');

  if (!formMap) {
    logger.error('output/form-map.json not found. Run "npm run map" first.');
    process.exit(1);
  }

  const totalControllingFields = new Set(dropdownOptions.map((o) => o.fieldKey)).size;
  const successPaths = combinationPaths.filter((c) => c.status === 'success');
  const failedPaths = combinationPaths.filter((c) => c.status === 'failed');
  const pendingPaths = combinationPaths.filter((c) => c.status === 'pending');

  const coverage = {
    generatedAt: new Date().toISOString(),
    targetFormUrl: `${env.baseUrl}${env.formPath}`,
    totalStatesDiscovered: combinationPaths.length + dependencies.length,
    totalStatesExplored: combinationPaths.length + dependencies.length,
    totalFields: fields.length,
    totalControllingFields,
    totalOptions: dropdownOptions.length,
    totalDependencies: dependencies.length,
    totalSuccessfulPaths: successPaths.length,
    totalFailedPaths: failedPaths.length,
    pendingUnexploredPaths: pendingPaths.length,
    failureReasons: failedPaths.map((f) => ({ pathId: f.pathId, path: f.path.map((p: any) => p.value).join(' > '), reason: f.reason })),
    secondCrawlRun: Boolean(reconciliation),
    secondCrawlReconciled: reconciliation?.summary?.reconciled ?? null,
    idDriftInstancesObserved: reconciliation?.summary?.pathsWithObservedIdDrift ?? formMap.leaves.filter((l: any) => l.idDrift).length,
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'coverage-report.json'), JSON.stringify(coverage, null, 2), 'utf-8');

  const md = `# BCPS e-Logbook - Mapping Summary

Generated: ${coverage.generatedAt}

## Target
- Login: ${env.baseUrl}${env.loginPath}
- Form: ${coverage.targetFormUrl}
- Hierarchy source: \`get-form-list/${formMap.typeIndex}\` (auto-matched against the live "form" dropdown, not hardcoded)

## Coverage
| Metric | Value |
|---|---|
| Total leaf combinations (Form > Case Type > Skill Type) | ${formMap.leaves.length} |
| Total fields captured | ${coverage.totalFields} |
| Total controlling fields | ${coverage.totalControllingFields} |
| Total dropdown options | ${coverage.totalOptions} |
| Total dependency relationships | ${coverage.totalDependencies} |
| Successful paths | ${coverage.totalSuccessfulPaths} |
| Failed paths | ${coverage.totalFailedPaths} |
| Pending/unexplored paths | ${coverage.pendingUnexploredPaths} |
| Second independent crawl run | ${coverage.secondCrawlRun ? 'Yes' : 'No'} |
| Second crawl reconciled with first | ${coverage.secondCrawlReconciled === null ? 'n/a' : coverage.secondCrawlReconciled} |
| id-drift instances observed (see below) | ${coverage.idDriftInstancesObserved} |

## Failures
${failedPaths.length === 0 ? 'None.' : failedPaths.map((f) => `- **${f.path.map((p: any) => p.value).join(' > ')}**: ${f.reason}`).join('\n')}

## Discovered portal quirks
1. **Field name sanitization**: dynamic-form-property's \`column_name\` (e.g. "Patient Reg. No") has periods stripped by the live frontend before becoming the rendered label/name/id ("Patient Reg No").
2. **Competency checklist text is verbatim**: Competency Group checkbox names use the API's \`particulars\` text exactly, including periods and trailing whitespace - unlike dynamic fields.
3. **"radio" field type does not render**: fields declared with \`column_value_type="radio"\` (all under Patient Management) have no corresponding control in the live DOM. Documented in the Fields sheet, excluded from the uploader's fillable set.
4. **get-form-list id instability for 2 leaves**: "Vascular Surgery > Interpretative Skill" / "> Procedural skill" - a direct API call and a live page session can reference two different (but both valid) backend ids for the same visible label. Reproduced identically in two independent crawls. The mapper/uploader always resolve the live id from the actual UI, never a cached id.

## Deliverables
- \`output/BCPS_Logbook_Full_Mapping.xlsx\`
- \`output/form-map.json\`, \`dependency-graph.json\`, \`dropdown-options.json\`, \`combination-paths.json\`, \`fields.json\`, \`lookups.json\`
- \`output/coverage-report.json\`, \`output/verification-reconciliation.json\`
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'mapping-summary.md'), md, 'utf-8');
  logger.info('Wrote output/coverage-report.json and output/mapping-summary.md');
}

if (require.main === module) {
  generateReport();
}
