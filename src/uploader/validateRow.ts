import { DataEntryRow } from './excelReader';
import { skillTypeHasCompetencyLevel } from './competencyLevel';

export interface LeafForValidation {
  leafId: string;
  pathLabels: string[];
  fields: { column_name: string; column_value_type: string; required_ind: number }[];
  // log_entry_target is optional in the type only because older call sites
  // (and the unit tests) construct fixtures without it; every real caller
  // building this from output/form-map.json already carries it through at
  // runtime (form-map.json's raw leaf.competencyGroup entries include it),
  // this just widens the type to make it usable for Level validation below.
  competencyGroup: { particulars: string; log_entry_target?: { compitency_level: string | null }[] }[];
}

export interface RowValidationResult {
  valid: boolean;
  errors: string[];
  resolvedLeaf: LeafForValidation | null;
}

function stripDots(s: string): string {
  return s.replace(/\./g, '').trim().replace(/\s+/g, ' ');
}

export function validateRow(row: DataEntryRow, leaves: LeafForValidation[]): RowValidationResult {
  const errors: string[] = [];

  if (row.action !== 'SAVE_DRAFT') {
    return { valid: false, errors: [`Action must be "SAVE_DRAFT" (got "${row.action}").`], resolvedLeaf: null };
  }
  if (!row.form || !row.caseType) {
    errors.push('Form and CaseType are required.');
  }

  const candidates = leaves.filter((l) => l.pathLabels[0] === row.form && l.pathLabels[1] === row.caseType);
  let resolvedLeaf: LeafForValidation | null = null;
  if (candidates.length === 0) {
    errors.push(`No mapped combination found for Form="${row.form}", CaseType="${row.caseType}". Check DropdownOptions/CombinationPaths sheets for valid values.`);
  } else if (candidates.length === 1 && !candidates[0].pathLabels[2]) {
    resolvedLeaf = candidates[0];
    if (row.skillType) errors.push(`This combination has no Skill Type level, but SkillType="${row.skillType}" was provided.`);
  } else {
    const withSkill = candidates.find((l) => l.pathLabels[2] === row.skillType);
    if (!withSkill) {
      const options = candidates.map((l) => l.pathLabels[2]).filter(Boolean);
      errors.push(`SkillType="${row.skillType}" is not valid for Form="${row.form}", CaseType="${row.caseType}". Valid options: ${options.join(', ')}`);
    } else {
      resolvedLeaf = withSkill;
    }
  }

  if (row.combinationKey && resolvedLeaf && row.combinationKey !== resolvedLeaf.leafId) {
    errors.push(
      `CombinationKey "${row.combinationKey}" does not match the id resolved from Form/CaseType/SkillType ("${resolvedLeaf.leafId}"). The uploader trusts the live-resolved id; verify this row's CombinationKey is up to date.`
    );
  }

  if (resolvedLeaf) {
    const requiredCore = [
      ['dateOfAssignment', 'Date of Assignment'],
      ['nameOfPatient', 'Name of the Patient'],
      ['patientRegNo', 'Patient Reg No'],
      ['dateOfBirth', 'Date of Birth'],
      ['age', 'Age'],
    ] as const;
    const leafFieldNames = new Set(resolvedLeaf.fields.filter((f) => f.column_value_type !== 'radio').map((f) => stripDots(f.column_name)));
    for (const [rowKey, displayName] of requiredCore) {
      const isApplicable = leafFieldNames.has(displayName) || leafFieldNames.has(stripDots(displayName));
      if (isApplicable && !row[rowKey]) {
        errors.push(`"${displayName}" is required for this combination but is blank.`);
      }
    }

    const validCompetencyNames = new Set(resolvedLeaf.competencyGroup.map((c) => c.particulars.trim()));
    for (const item of row.competencyItems) {
      const matches = [...validCompetencyNames].some((v) => v.trim() === item.trim());
      if (!matches) {
        errors.push(`Competency item "${item}" is not valid for this combination. Valid items: ${[...validCompetencyNames].join('; ') || '(none)'}`);
      }
    }

    // Competency Level enforcement. Applies globally by SkillType - NOT a
    // Basic Surgical Skill-only or CaseType-specific rule. Per the
    // 2026-09-10 full form audit: every genuine Procedural competency item
    // exposes 4 Level checkboxes in the live DOM, but only some of those 4
    // are valid per the mapped source data (log_entry_target.compitency_level).
    // Communication and Writing Skill items carry the same Level concept
    // (confirmed both in output/form-map.json - every mapped Communication
    // item has valid levels "3","4" - and in a live no-save portal check);
    // Interpretative Skill items never do. skillTypeHasCompetencyLevel() is
    // the single shared source of truth for this, also used by
    // fillForm.ts, so the two can never diverge.
    // The workbook never carried this per-row choice before; it is now
    // represented as an optional "CompetencyLevel" key in ExtraFieldsJSON.
    // This validator enforces the non-negotiable rule as early as possible
    // (at dry-run time, before any browser is launched): exactly one
    // checked skill, and an explicit, valid Level whenever the skill has
    // more than one valid level. Never guesses.
    if (skillTypeHasCompetencyLevel(resolvedLeaf.pathLabels[2])) {
      if (row.competencyItems.length === 0) {
        errors.push(`This is a ${resolvedLeaf.pathLabels[2]} row but no competency item is checked in CompetencyItemsChecked.`);
      } else if (row.competencyItems.length > 1) {
        errors.push(`Exactly one competency item must be checked per ${resolvedLeaf.pathLabels[2]} row; found ${row.competencyItems.length}: ${row.competencyItems.join('; ')}.`);
      } else {
        const itemName = row.competencyItems[0].trim();
        const match = resolvedLeaf.competencyGroup.find((c) => c.particulars.trim() === itemName);
        const validLevels = (match?.log_entry_target ?? [])
          .map((t) => t.compitency_level)
          .filter((l): l is string => l !== null && l !== undefined && l !== '');
        const providedLevel = row.extraFields['CompetencyLevel']?.trim();

        // TEST_ONLY_UNMAPPED_LEVEL_OVERRIDE: a narrow, explicitly-flagged
        // escape hatch for deliberately testing a portal-rendered Level
        // checkbox (1-4) that the mapped source data does NOT list as valid
        // for this exact competency (e.g. Abdominal Wall's "Open and
        // laparoscopic repair of inguinal hernia", mapped only to level "5").
        // Only ever bypasses the mismatch checks below when the row sets
        // ExtraFieldsJSON "TestOnlyLevelOverride": "true" AND the provided
        // level is one of the 4 levels the portal can actually render - it
        // never allows a blank level, multiple levels, or a level outside
        // 1-4, and it changes behavior for THIS row only, never globally.
        const testOnlyOverride = row.extraFields['TestOnlyLevelOverride']?.trim() === 'true';
        const isRenderableLevel = providedLevel != null && ['1', '2', '3', '4'].includes(providedLevel);

        if (testOnlyOverride && isRenderableLevel) {
          // Deliberately skip the mapped-level checks - acknowledged override.
        } else if (validLevels.length === 0) {
          if (providedLevel) {
            errors.push(`CompetencyLevel "${providedLevel}" was provided for "${itemName}", but this item has no valid competence levels mapped at all.`);
          }
        } else if (validLevels.length === 1) {
          if (providedLevel && providedLevel !== validLevels[0]) {
            errors.push(`CompetencyLevel "${providedLevel}" was provided for "${itemName}", but the only valid level is "${validLevels[0]}".`);
          }
          // else: unambiguous - auto-resolved even when not explicitly provided, for backward compatibility with existing workbooks.
        } else if (!providedLevel) {
          errors.push(`"${itemName}" has ${validLevels.length} valid competence levels (${validLevels.join(', ')}) - CompetencyLevel must be set explicitly in ExtraFieldsJSON for this row. Refusing to guess.`);
        } else if (!validLevels.includes(providedLevel)) {
          errors.push(`CompetencyLevel "${providedLevel}" is not valid for "${itemName}". Valid levels: ${validLevels.join(', ')}.`);
        }
      }
    }

    const knownExtraFieldNames = new Set(
      resolvedLeaf.fields
        .filter((f) => f.column_value_type !== 'radio' && !requiredCore.some(([, d]) => stripDots(d) === stripDots(f.column_name)))
        .map((f) => stripDots(f.column_name))
    );
    for (const key of Object.keys(row.extraFields)) {
      if (key === '__PARSE_ERROR__') {
        errors.push(`ExtraFieldsJSON is not valid JSON: ${row.extraFields[key]}`);
        continue;
      }
      if (key === 'CompetencyLevel') continue; // reserved tool key, validated separately above - not a real portal field
      if (key === 'TestOnlyLevelOverride') continue; // reserved tool key, validated separately above - not a real portal field
      if (!knownExtraFieldNames.has(stripDots(key))) {
        errors.push(`ExtraFieldsJSON key "${key}" is not a known field for this combination. Known extra fields: ${[...knownExtraFieldNames].join('; ') || '(none)'}`);
      }
    }
    for (const f of resolvedLeaf.fields) {
      if (f.column_value_type === 'radio') continue;
      const name = stripDots(f.column_name);
      if (requiredCore.some(([, d]) => stripDots(d) === name)) continue;
      if (f.required_ind === 1 && !row.extraFields[f.column_name] && !row.extraFields[name]) {
        errors.push(`"${f.column_name}" is required for this combination but is missing from ExtraFieldsJSON.`);
      }
    }
  }

  return { valid: errors.length === 0, errors, resolvedLeaf };
}
