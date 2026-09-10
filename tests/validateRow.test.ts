import { validateRow, LeafForValidation } from '../src/uploader/validateRow';
import { DataEntryRow } from '../src/uploader/excelReader';

const leaves: LeafForValidation[] = [
  {
    leafId: 'leaf-1',
    pathLabels: ['Form A', 'Case 1', 'Skill X'],
    fields: [
      { column_name: 'Date of Assignment', column_value_type: 'date', required_ind: 1 },
      { column_name: 'Name of the Patient', column_value_type: 'text', required_ind: 1 },
      { column_name: 'Patient Reg. No', column_value_type: 'text', required_ind: 1 },
      { column_name: 'Date of Birth', column_value_type: 'date', required_ind: 1 },
      { column_name: 'Age', column_value_type: 'text', required_ind: 1 },
      { column_name: 'Notes', column_value_type: 'textarea', required_ind: 0 },
    ],
    competencyGroup: [{ particulars: 'Item One' }, { particulars: 'Item Two ' }],
  },
  {
    leafId: 'leaf-2',
    pathLabels: ['Form B', 'Case 2'],
    fields: [
      { column_name: 'Date of Assignment', column_value_type: 'date', required_ind: 1 },
      { column_name: 'Name of the Patient', column_value_type: 'text', required_ind: 1 },
      { column_name: 'Patient Reg. No', column_value_type: 'text', required_ind: 1 },
      { column_name: 'Date of Birth', column_value_type: 'date', required_ind: 1 },
      { column_name: 'Age', column_value_type: 'text', required_ind: 1 },
    ],
    competencyGroup: [],
  },
  {
    leafId: 'leaf-3',
    pathLabels: ['Form A', 'Case 3', 'Procedural skill'],
    fields: [
      { column_name: 'Date of Assignment', column_value_type: 'date', required_ind: 1 },
      { column_name: 'Name of the Patient', column_value_type: 'text', required_ind: 1 },
      { column_name: 'Patient Reg. No', column_value_type: 'text', required_ind: 1 },
      { column_name: 'Date of Birth', column_value_type: 'date', required_ind: 1 },
      { column_name: 'Age', column_value_type: 'text', required_ind: 1 },
    ],
    competencyGroup: [
      { particulars: 'Single Level Skill', log_entry_target: [{ compitency_level: '4' }] },
      { particulars: 'Multi Level Skill', log_entry_target: [{ compitency_level: '2' }, { compitency_level: '3' }] },
      { particulars: 'Unselectable Level Skill', log_entry_target: [{ compitency_level: '5' }] },
    ],
  },
];

function proceduralRow(overrides: Partial<DataEntryRow>): DataEntryRow {
  return {
    excelRow: 2,
    externalRowId: 'ROW-1',
    action: 'SAVE_DRAFT',
    combinationKey: '',
    form: 'Form A',
    caseType: 'Case 3',
    skillType: 'Procedural skill',
    dateOfAssignment: '2026-01-01',
    nameOfPatient: 'Jane Doe',
    patientRegNo: '123',
    dateOfBirth: '1990-01-01',
    age: '36',
    competencyItems: [],
    extraFields: {},
    ...overrides,
  };
}

function baseRow(overrides: Partial<DataEntryRow>): DataEntryRow {
  return {
    excelRow: 2,
    externalRowId: 'ROW-1',
    action: 'SAVE_DRAFT',
    combinationKey: '',
    form: 'Form A',
    caseType: 'Case 1',
    skillType: 'Skill X',
    dateOfAssignment: '2026-01-01',
    nameOfPatient: 'Jane Doe',
    patientRegNo: '123',
    dateOfBirth: '1990-01-01',
    age: '36',
    competencyItems: [],
    extraFields: {},
    ...overrides,
  };
}

describe('validateRow', () => {
  it('accepts a fully valid row for a 3-level combination', () => {
    const result = validateRow(baseRow({ extraFields: { Notes: 'ok' } }), leaves);
    expect(result.valid).toBe(true);
    expect(result.resolvedLeaf?.leafId).toBe('leaf-1');
  });

  it('rejects any Action other than SAVE_DRAFT', () => {
    const result = validateRow(baseRow({ action: 'FINAL_SUBMIT' }), leaves);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/SAVE_DRAFT/);
  });

  it('rejects an unknown Form/CaseType combination', () => {
    const result = validateRow(baseRow({ form: 'Nonexistent Form' }), leaves);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('No mapped combination'))).toBe(true);
  });

  it('rejects a SkillType not valid for the given CaseType', () => {
    const result = validateRow(baseRow({ skillType: 'Not A Real Skill' }), leaves);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('is not valid for Form'))).toBe(true);
  });

  it('accepts a 2-level combination (no SkillType) when SkillType is left blank', () => {
    const result = validateRow(baseRow({ form: 'Form B', caseType: 'Case 2', skillType: '' }), leaves);
    expect(result.valid).toBe(true);
    expect(result.resolvedLeaf?.leafId).toBe('leaf-2');
  });

  it('flags a missing required core field', () => {
    const result = validateRow(baseRow({ patientRegNo: '' }), leaves);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Patient Reg No'))).toBe(true);
  });

  it('accepts a competency item that matches after trimming', () => {
    const result = validateRow(baseRow({ competencyItems: ['Item Two'], extraFields: { Notes: 'ok' } }), leaves);
    expect(result.valid).toBe(true);
  });

  it('rejects a competency item not in the combination\'s list', () => {
    const result = validateRow(baseRow({ competencyItems: ['Not A Real Item'] }), leaves);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('not valid for this combination'))).toBe(true);
  });

  it('rejects an ExtraFieldsJSON key that is not a known field', () => {
    const result = validateRow(baseRow({ extraFields: { NotARealField: 'x' } }), leaves);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('not a known field'))).toBe(true);
  });

  it('reports a JSON parse error distinctly', () => {
    const result = validateRow(baseRow({ extraFields: { __PARSE_ERROR__: '{bad json' } }), leaves);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('not valid JSON'))).toBe(true);
  });
});

describe('validateRow - Procedural Competency Level enforcement', () => {
  it('accepts a single-valid-level skill with no explicit CompetencyLevel (backward compatible)', () => {
    const result = validateRow(proceduralRow({ competencyItems: ['Single Level Skill'] }), leaves);
    expect(result.valid).toBe(true);
  });

  it('rejects a Procedural row with no competency item checked at all', () => {
    const result = validateRow(proceduralRow({ competencyItems: [] }), leaves);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('no competency item is checked'))).toBe(true);
  });

  it('rejects a Procedural row with more than one competency item checked', () => {
    const result = validateRow(proceduralRow({ competencyItems: ['Single Level Skill', 'Multi Level Skill'] }), leaves);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Exactly one competency item'))).toBe(true);
  });

  it('rejects a multi-level skill with no explicit CompetencyLevel - refuses to guess', () => {
    const result = validateRow(proceduralRow({ competencyItems: ['Multi Level Skill'] }), leaves);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('CompetencyLevel must be set explicitly'))).toBe(true);
  });

  it('accepts a multi-level skill with a valid explicit CompetencyLevel', () => {
    const result = validateRow(proceduralRow({ competencyItems: ['Multi Level Skill'], extraFields: { CompetencyLevel: '3' } }), leaves);
    expect(result.valid).toBe(true);
  });

  it('rejects a multi-level skill with an invalid explicit CompetencyLevel', () => {
    const result = validateRow(proceduralRow({ competencyItems: ['Multi Level Skill'], extraFields: { CompetencyLevel: '1' } }), leaves);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('is not valid for'))).toBe(true);
  });

  it('rejects a single-valid-level skill when the explicit CompetencyLevel disagrees with it', () => {
    const result = validateRow(proceduralRow({ competencyItems: ['Single Level Skill'], extraFields: { CompetencyLevel: '2' } }), leaves);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('the only valid level is'))).toBe(true);
  });

  it('does not flag "CompetencyLevel" as an unknown ExtraFieldsJSON key', () => {
    const result = validateRow(proceduralRow({ competencyItems: ['Single Level Skill'], extraFields: { CompetencyLevel: '4' } }), leaves);
    expect(result.errors.some((e) => e.includes('not a known field'))).toBe(false);
  });
});
