import { Page } from 'playwright';
import { logger } from '../utils/logger';
import { waitForStable } from '../utils/waitStable';
import { fetchFormListTree, fetchDynamicProperties, fetchLookupData, FormTreeNode } from './api';
import { walkTree, LeafRecord, DropdownOptionRow } from './model';
import { DependencyRecord } from '../models/types';
import { saveCheckpoint, loadCheckpoint } from '../utils/checkpoint';
import { formUrl } from '../utils/env';
import { settle } from '../utils/browser';

export interface DiscoverCheckpoint {
  typeIndex: number;
  formOptions: { text: string; id: string }[];
  tree: FormTreeNode[];
  dropdownOptions: DropdownOptionRow[];
  dependencies: DependencyRecord[];
  leaves: LeafRecord[];
  lookups: Record<string, any>;
  triedTypeIndexes: { index: number; topLevelCount: number }[];
  completedFieldFetch: boolean;
}

const DEFAULT_CHECKPOINT_NAME = 'discover';

async function getLiveFormOptions(page: Page): Promise<{ text: string; id: string }[]> {
  await page.goto(formUrl(), { waitUntil: 'domcontentloaded' });
  await settle(page, 800);
  const options = await waitForStable(page, () =>
    page.evaluate(() => {
      const sel = document.querySelector('select[name="form"]') as HTMLSelectElement | null;
      return sel ? Array.from(sel.options).filter((o) => o.value !== '').map((o) => ({ text: o.text.trim(), id: o.value })) : [];
    })
  );
  return options;
}

/**
 * Rather than assuming the tree index used by get-form-list/{N} is always 1,
 * this discovers it live: it tries a bounded range of indexes and picks the
 * one whose top-level ids exactly match the live "form" <select> options.
 */
async function discoverMatchingTree(page: Page, formOptions: { text: string; id: string }[]) {
  const tried: { index: number; topLevelCount: number }[] = [];
  const targetIds = new Set(formOptions.map((o) => o.id));
  for (let idx = 1; idx <= 10; idx++) {
    const tree = await fetchFormListTree(page, idx);
    if (!tree) {
      tried.push({ index: idx, topLevelCount: 0 });
      continue;
    }
    tried.push({ index: idx, topLevelCount: tree.length });
    const treeIds = new Set(tree.map((n) => n.id));
    const matches = tree.length === targetIds.size && [...targetIds].every((id) => treeIds.has(id));
    if (matches) {
      return { typeIndex: idx, tree, tried };
    }
  }
  return { typeIndex: -1, tree: null, tried };
}

export async function runDiscover(page: Page, opts: { resume: boolean; checkpointName?: string }): Promise<DiscoverCheckpoint> {
  const CHECKPOINT_NAME = opts.checkpointName ?? DEFAULT_CHECKPOINT_NAME;
  let cp = opts.resume ? loadCheckpoint<DiscoverCheckpoint>(CHECKPOINT_NAME) : null;

  if (!cp) {
    logger.info('Discovering live "form" dropdown options...');
    const formOptions = await getLiveFormOptions(page);
    logger.info(`Live form options: ${formOptions.map((o) => o.text).join(', ')}`);

    logger.info('Matching get-form-list/{N} tree against live form options...');
    const { typeIndex, tree, tried } = await discoverMatchingTree(page, formOptions);
    if (typeIndex === -1 || !tree) {
      throw new Error(
        `Could not find a get-form-list/{N} response (N=1..10) whose top-level items match the live "form" dropdown options. Tried: ${JSON.stringify(tried)}`
      );
    }
    logger.info(`Matched get-form-list/${typeIndex} as the authoritative hierarchy tree for this form.`);

    const { dropdownOptions, dependencies, leaves } = walkTree(tree);
    logger.info(`Tree walk complete: ${dropdownOptions.length} dropdown option rows, ${leaves.length} leaf combinations discovered.`);

    cp = {
      typeIndex,
      formOptions,
      tree,
      dropdownOptions,
      dependencies,
      leaves,
      lookups: {},
      triedTypeIndexes: tried,
      completedFieldFetch: false,
    };
    saveCheckpoint(CHECKPOINT_NAME, cp);
  } else {
    logger.info(`Resuming discovery from checkpoint: ${cp.leaves.filter((l) => l.fields || l.fieldsFetchError).length}/${cp.leaves.length} leaves already fetched.`);
  }

  if (!cp.completedFieldFetch) {
    for (let i = 0; i < cp.leaves.length; i++) {
      const leaf = cp.leaves[i];
      if (leaf.fields || leaf.fieldsFetchError) continue; // already done (resume)
      try {
        const fields = await fetchDynamicProperties(page, leaf.leafId);
        if (fields) {
          leaf.fields = fields;
          logger.info(`[${i + 1}/${cp.leaves.length}] Fetched ${fields.length} field(s) for leaf "${leaf.pathLabels.join(' > ')}"`);
        } else {
          leaf.fieldsFetchError = 'dynamic-form-property-by-particular returned non-200 or malformed response';
          logger.error(`[${i + 1}/${cp.leaves.length}] Field fetch FAILED for leaf "${leaf.pathLabels.join(' > ')}"`);
        }
      } catch (err: any) {
        leaf.fieldsFetchError = `Exception: ${err?.message ?? err}`;
        logger.error(`[${i + 1}/${cp.leaves.length}] Field fetch EXCEPTION for leaf "${leaf.pathLabels.join(' > ')}": ${err?.message ?? err}`);
      }
      if ((i + 1) % 5 === 0 || i === cp.leaves.length - 1) {
        saveCheckpoint(CHECKPOINT_NAME, cp);
      }
    }
    cp.completedFieldFetch = true;
    saveCheckpoint(CHECKPOINT_NAME, cp);
  }

  if (!cp.lookups.competence_level) {
    logger.info('Fetching reference lookup: competence_level');
    const lookup = await fetchLookupData(page, 'competence_level');
    cp.lookups.competence_level = lookup ?? { error: 'fetch failed or empty' };
    saveCheckpoint(CHECKPOINT_NAME, cp);
  }

  return cp;
}
