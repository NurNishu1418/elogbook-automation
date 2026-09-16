/**
 * Single source of truth for which SkillTypes carry a Level of Performance
 * concept on the live portal (per output/form-map.json's log_entry_target
 * data, cross-checked against the physical BCPS logbook): Procedural skill
 * AND Communication and Writing Skill items both carry mapped Level values;
 * Interpretative Skill items never do. This is NOT a Basic Surgical
 * Skill-only or CaseType-specific rule - it applies globally by SkillType.
 *
 * Shared by validateRow.ts (dry-run) and fillForm.ts (live fill) so the two
 * can never diverge on which rows require level enforcement.
 */
export function skillTypeHasCompetencyLevel(skillType: string): boolean {
  return skillType === 'Procedural skill' || skillType === 'Communication and Writing Skill';
}
