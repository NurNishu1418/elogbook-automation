import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn, LoginBlockedError } from '../auth/login';
import { logger } from '../utils/logger';
import { runDiscover } from './discover';
import { runLiveUiVerification } from './verifyLiveUi';
import { buildFieldRecordsForLeaf, buildCombinationPaths } from './model';
import { FieldRecord } from '../models/types';
import { generateReport } from './report';
import { generateExcel } from '../excel/generate';

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'output');

async function main() {
  const resume = process.argv.includes('--resume');
  const specialtyArg = process.argv.find(a => a.startsWith('--specialty='))?.split('=')[1]
    ?? (process.argv.includes('--specialty') ? process.argv[process.argv.indexOf('--specialty') + 1] : null);
  const mapFileName = specialtyArg ? `form-map-${specialtyArg.toLowerCase()}.json` : 'form-map.json';
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  try {
    logger.info(`Starting mapping run (resume=${resume})`);
    let loginResult;
    try {
      loginResult = await ensureLoggedIn(page);
    } catch (err) {
      if (err instanceof LoginBlockedError) {
        logger.error(`BLOCKED: ${err.message}`);
        process.exitCode = 2;
        return;
      }
      throw err;
    }
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      process.exitCode = 2;
      return;
    }
    logger.info('Login confirmed.');

    const cp = await runDiscover(page, { resume });
    logger.info(`Discovery phase complete. Type index=${cp.typeIndex}. Leaves=${cp.leaves.length}.`);

    logger.info('Starting live UI verification pass (second, independent confirmation of every path)...');
    await runLiveUiVerification(page, cp);
    const verifiedCount = cp.leaves.filter((l) => l.uiVerified).length;
    const failedCount = cp.leaves.filter((l) => l.uiVerified === false).length;
    logger.info(`Live UI verification complete: ${verifiedCount} verified, ${failedCount} failed, out of ${cp.leaves.length}.`);

    const allFields: FieldRecord[] = [];
    for (const leaf of cp.leaves) {
      allFields.push(...buildFieldRecordsForLeaf(leaf));
    }
    const combinationPaths = buildCombinationPaths(cp.leaves);

    if (specialtyArg) logger.info(`Specialty: ${specialtyArg} — saving as ${mapFileName}`);
    fs.writeFileSync(
      path.join(OUTPUT_DIR, mapFileName),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          typeIndex: cp.typeIndex,
          formOptions: cp.formOptions,
          totalLeaves: cp.leaves.length,
          totalFields: allFields.length,
          leaves: cp.leaves,
        },
        null,
        2
      ),
      'utf-8'
    );

    fs.writeFileSync(path.join(OUTPUT_DIR, 'dependency-graph.json'), JSON.stringify(cp.dependencies, null, 2), 'utf-8');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'dropdown-options.json'), JSON.stringify(cp.dropdownOptions, null, 2), 'utf-8');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'combination-paths.json'), JSON.stringify(combinationPaths, null, 2), 'utf-8');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'fields.json'), JSON.stringify(allFields, null, 2), 'utf-8');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'lookups.json'), JSON.stringify(cp.lookups, null, 2), 'utf-8');

    logger.info(`Wrote form-map.json, dependency-graph.json, dropdown-options.json, combination-paths.json, fields.json, lookups.json to ${OUTPUT_DIR}`);
  } finally {
    await browser.close();
  }

  generateReport();
  await generateExcel();
  logger.info('Mapping run complete.');
}

main().catch((err) => {
  logger.error(`Mapping run crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
