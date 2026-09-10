import { FormTreeNode, CompetencyGroupNode, DynamicFieldDef } from './api';
import { FieldRecord, DependencyRecord, CombinationPathRecord, OptionDescriptor } from '../models/types';

export interface DropdownOptionRow {
  fieldKey: string;
  completeParentPath: string;
  optionText: string;
  optionValue: string;
  enabled: boolean;
  isDefault: boolean;
  displayOrder: number;
}

export interface LeafRecord {
  leafId: string;
  pathLabels: string[];
  pathIds: string[];
  hasCompetenceLevels: boolean;
  competencyGroup: CompetencyGroupNode[];
  fields?: DynamicFieldDef[];
  fieldsFetchError?: string;
  uiVerified?: boolean;
  uiVerifyError?: string;
  idDrift?: { cachedId: string; liveId: string; cachedFieldCount: number; liveFieldCount: number };
}

export interface MappingModel {
  typeIndex: number;
  formOptions: { text: string; id: string }[];
  dropdownOptions: DropdownOptionRow[];
  dependencies: DependencyRecord[];
  leaves: LeafRecord[];
  fields: FieldRecord[];
  combinationPaths: CombinationPathRecord[];
}

function normalizeLabel(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/**
 * The dynamic-form-property field renderer strips literal "." characters
 * from column_name before using it as the rendered label AND the input's
 * name/id/for attributes (confirmed live: API "Patient Reg. No" renders
 * everywhere as "Patient Reg No"). The competency-group checklist renderer
 * does NOT do this - it uses `particulars` verbatim, periods and trailing
 * whitespace included (confirmed live: "Core-cut biopsy " keeps its
 * trailing space, "...etc.)" keeps its period). These are two different
 * React components with different sanitization behaviour - do not merge
 * the two transforms.
 */
export function toDomFieldText(apiText: string): string {
  return normalizeLabel(apiText.replace(/\./g, ''));
}

export function toDomCompetencyText(apiText: string): string {
  return apiText;
}

function levelName(depth: number): string {
  // depth 0 = Form, 1 = Case Type, 2 = Skill Type, 3+ = deeper entry_setup_master nesting (none observed, but supported)
  if (depth === 0) return 'Form';
  if (depth === 1) return 'CaseType';
  if (depth === 2) return 'SkillType';
  return `SkillTypeLevel${depth}`;
}

/**
 * Walks the get-form-list tree recursively. A node is a "leaf" once its
 * entry_setup_master array is empty - at that point dynamic-form-property
 * fields and (optionally) a competency_group checklist apply to it. This
 * matches the live UI exactly (verified via recon-ui-path2/3): the cascade
 * of dropdowns stops exactly where entry_setup_master stops.
 */
export function walkTree(tree: FormTreeNode[]): { dropdownOptions: DropdownOptionRow[]; dependencies: DependencyRecord[]; leaves: LeafRecord[] } {
  const dropdownOptions: DropdownOptionRow[] = [];
  const dependencies: DependencyRecord[] = [];
  const leaves: LeafRecord[] = [];

  function visit(nodes: FormTreeNode[], depth: number, parentPathLabels: string[], parentPathIds: string[], parentField: string) {
    const fieldKey = levelName(depth);
    const parentPath = parentPathLabels.length ? parentPathLabels.join(' > ') : '(root)';

    nodes.forEach((node, idx) => {
      dropdownOptions.push({
        fieldKey,
        completeParentPath: parentPath,
        optionText: normalizeLabel(node.particulars),
        optionValue: node.id,
        enabled: node.is_show_ind !== 0,
        isDefault: idx === 0 && depth === 0 ? false : false,
        displayOrder: node.sl_no ?? idx + 1,
      });
    });

    if (nodes.length > 0) {
      dependencies.push({
        parentPath,
        controllingField: parentField,
        selectedOptionText: parentPathLabels[parentPathLabels.length - 1] ?? '(initial page load)',
        selectedOptionValue: parentPathIds[parentPathIds.length - 1] ?? '',
        affectedField: fieldKey,
        effect: 'options-changed',
        beforeState: 'no options loaded',
        afterState: `${nodes.length} option(s) available: ${nodes.map((n) => normalizeLabel(n.particulars)).join(', ')}`,
        evidence: 'get-form-list API tree (cross-checked against live dropdown options in recon-ui-path2)',
      });
    }

    for (const node of nodes) {
      const label = normalizeLabel(node.particulars);
      const nextPathLabels = [...parentPathLabels, label];
      const nextPathIds = [...parentPathIds, node.id];
      const children = node.entry_setup_master ?? [];
      if (children.length === 0) {
        leaves.push({
          leafId: node.id,
          pathLabels: nextPathLabels,
          pathIds: nextPathIds,
          hasCompetenceLevels: node.has_competence_levels === 1,
          competencyGroup: node.competency_group ?? [],
        });
      } else {
        visit(children, depth + 1, nextPathLabels, nextPathIds, fieldKey);
      }
    }
  }

  visit(tree, 0, [], [], '(page load)');
  return { dropdownOptions, dependencies, leaves };
}

function mapColumnValueType(t: string): string {
  const key = (t || '').toLowerCase();
  if (key.includes('date')) return 'date';
  if (key.includes('textarea')) return 'textarea';
  if (key.includes('select') || key.includes('dropdown')) return 'select';
  if (key.includes('checkbox')) return 'checkbox';
  if (key.includes('radio')) return 'radio';
  if (key.includes('number')) return 'number';
  return 'text';
}

export function buildFieldRecordsForLeaf(leaf: LeafRecord): FieldRecord[] {
  const records: FieldRecord[] = [];
  const parentPath = leaf.pathLabels.join(' > ');

  for (const f of leaf.fields ?? []) {
    const controlType = mapColumnValueType(f.column_value_type);
    const domName = toDomFieldText(f.column_name);
    const rendersLive = f.column_value_type !== 'radio'; // confirmed live: radio-type fields do not render any control
    const options: OptionDescriptor[] | null =
      f.options && f.options.length > 0
        ? f.options.map((o) => ({ text: o.text ?? o.label ?? String(o.value ?? ''), value: String(o.value ?? o.text ?? ''), selected: false, disabled: false }))
        : null;
    records.push({
      fieldKey: `${leaf.leafId}::${f.id}`,
      label: domName,
      normalizedLabel: normalizeLabel(domName),
      section: leaf.pathLabels[0] ?? null,
      subsection: leaf.pathLabels.slice(1).join(' > ') || null,
      controlType,
      htmlName: domName,
      htmlId: null,
      role: null,
      primarySelector: `[name="${domName.replace(/"/g, '\\"')}"]`,
      fallbackSelectors: [`label:has-text("${domName}") ~ * ${controlType === 'textarea' ? 'textarea' : 'input,select'}`],
      required: f.required_ind === 1,
      initiallyVisible: false,
      currentlyVisible: rendersLive,
      enabled: true,
      readonly: false,
      placeholder: domName,
      defaultValue: null,
      helpText: [
        f.column_name !== domName ? `Portal API column_name "${f.column_name}" renders as "${domName}" (periods stripped by the frontend).` : null,
        !rendersLive
          ? `Declared by the dynamic-form-property API as column_value_type="radio" but confirmed live: no corresponding input/select renders in the DOM for this combination. Do not attempt to fill this field.`
          : f.details_text ?? null,
      ]
        .filter(Boolean)
        .join(' ') || null,
      minLength: null,
      maxLength: null,
      minValue: null,
      maxValue: null,
      dateRestriction: controlType === 'date' ? 'unspecified (live portal did not expose min/max date attributes at scan time)' : null,
      parentPath,
      appearsWhen: `Form/Case Type/Skill Type path resolves to leaf id ${leaf.leafId} (${parentPath})`,
      requiredWhen: f.required_ind === 1 ? 'always required once this leaf/combination is selected' : 'optional',
      options,
    });
  }

  for (const cg of leaf.competencyGroup ?? []) {
    const domName = toDomCompetencyText(cg.particulars);
    records.push({
      fieldKey: `${leaf.leafId}::cg::${cg.id}`,
      label: normalizeLabel(domName),
      normalizedLabel: normalizeLabel(domName),
      section: leaf.pathLabels[0] ?? null,
      subsection: `${leaf.pathLabels.slice(1).join(' > ')} > Competency Group` || 'Competency Group',
      controlType: 'checkbox',
      htmlName: domName,
      htmlId: domName,
      role: null,
      primarySelector: `input[type="checkbox"][name="${domName.replace(/"/g, '\\"')}"]`,
      fallbackSelectors: [`label:has-text("${normalizeLabel(domName)}") input[type="checkbox"]`],
      required: false,
      initiallyVisible: false,
      currentlyVisible: true,
      enabled: true,
      readonly: false,
      placeholder: null,
      defaultValue: null,
      helpText:
        [
          cg.particulars !== domName ? `Portal API particulars "${cg.particulars}" renders as "${domName}" (periods stripped).` : null,
          ...(cg.log_entry_target ?? []).map((t) => `target year=${t.year ?? 'n/a'} min=${t.min_value ?? 'n/a'} max=${t.max_value ?? 'n/a'}`),
        ]
          .filter(Boolean)
          .join('; ') || null,
      minLength: null,
      maxLength: null,
      minValue: null,
      maxValue: null,
      dateRestriction: null,
      parentPath: `${parentPath} > Competency Group`,
      appearsWhen: `Competency Group checklist rendered for leaf id ${leaf.leafId} (${parentPath})`,
      requiredWhen: 'optional (checklist item; no minimum-selection validation observed live)',
      options: null,
    });
  }

  return records;
}

/** Searches the full get-form-list tree for a node by id, at any depth. */
export function findNodeById(tree: FormTreeNode[], id: string): FormTreeNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findNodeById(node.entry_setup_master ?? [], id);
    if (found) return found;
  }
  return null;
}

export function buildCombinationPaths(leaves: LeafRecord[]): CombinationPathRecord[] {
  return leaves.map((leaf) => {
    let status: CombinationPathRecord['status'] = 'pending';
    if (leaf.fieldsFetchError) status = 'failed';
    else if (leaf.uiVerified === true) status = 'success';
    else if (leaf.uiVerified === false) status = 'failed';
    return {
      pathId: leaf.leafId,
      path: leaf.pathLabels.map((label, i) => ({ field: levelName(i), value: label })),
      status,
      reason: leaf.fieldsFetchError ?? leaf.uiVerifyError ?? (leaf.idDrift ? `id drift resolved (cached=${leaf.idDrift.cachedId}, live=${leaf.idDrift.liveId})` : null),
    };
  });
}
