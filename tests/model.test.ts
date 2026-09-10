import { walkTree, buildFieldRecordsForLeaf, toDomFieldText, toDomCompetencyText, findNodeById, LeafRecord } from '../src/mapper/model';
import { FormTreeNode } from '../src/mapper/api';

function node(partial: Partial<FormTreeNode>): FormTreeNode {
  return {
    particulars: '',
    setup_logbook_master_id: null,
    logbook_entry_setup_master_id: null,
    id: '',
    particulary_type: 1,
    course_type: 'core',
    sl_no: null,
    is_show_ind: 1,
    entry_setup_master: [],
    ...partial,
  };
}

const mockTree: FormTreeNode[] = [
  node({
    particulars: 'Form A',
    id: 'form-a',
    entry_setup_master: [
      node({
        particulars: 'Case 1',
        id: 'case-1',
        entry_setup_master: [
          node({
            particulars: 'Skill X',
            id: 'skill-x',
            has_competence_levels: 1,
            entry_setup_master: [],
            competency_group: [
              {
                particulars: 'Competency Item ',
                id: 'comp-1',
                particulary_type: 6,
                course_type: 'core',
                sl_no: null,
                is_show_ind: 1,
                competence_level_type: null,
                has_competence_levels: 1,
                childs: [],
                log_entry_target: [{ id: 't1', logbook_entry_setup_master_id: 'skill-x', compitency_level: null, year: 'core', max_value: '0', min_value: '5' }],
              },
            ],
          }),
        ],
      }),
    ],
  }),
];

describe('toDomFieldText', () => {
  it('strips periods and normalizes whitespace', () => {
    expect(toDomFieldText('Patient Reg. No')).toBe('Patient Reg No');
    expect(toDomFieldText('  Multi   Space ')).toBe('Multi Space');
  });
});

describe('toDomCompetencyText', () => {
  it('leaves the text completely verbatim, including trailing spaces and periods', () => {
    expect(toDomCompetencyText('Core-cut biopsy ')).toBe('Core-cut biopsy ');
    expect(toDomCompetencyText('Excision biopsy etc.)')).toBe('Excision biopsy etc.)');
  });
});

describe('walkTree', () => {
  const { dropdownOptions, dependencies, leaves } = walkTree(mockTree);

  it('produces one leaf per terminal entry_setup_master node', () => {
    expect(leaves).toHaveLength(1);
    expect(leaves[0].leafId).toBe('skill-x');
    expect(leaves[0].pathLabels).toEqual(['Form A', 'Case 1', 'Skill X']);
  });

  it('carries the competency_group array through onto the leaf', () => {
    expect(leaves[0].competencyGroup).toHaveLength(1);
    expect(leaves[0].competencyGroup[0].particulars).toBe('Competency Item ');
  });

  it('records a dropdown option row per level', () => {
    const formRow = dropdownOptions.find((o) => o.fieldKey === 'Form');
    expect(formRow?.optionText).toBe('Form A');
    const skillRow = dropdownOptions.find((o) => o.fieldKey === 'SkillType');
    expect(skillRow?.optionText).toBe('Skill X');
  });

  it('records a dependency edge for every level that has options', () => {
    expect(dependencies.length).toBeGreaterThanOrEqual(3);
  });
});

describe('buildFieldRecordsForLeaf', () => {
  const leaf: LeafRecord = {
    leafId: 'skill-x',
    pathLabels: ['Form A', 'Case 1', 'Skill X'],
    pathIds: ['form-a', 'case-1', 'skill-x'],
    hasCompetenceLevels: true,
    competencyGroup: mockTree[0].entry_setup_master[0].entry_setup_master[0].competency_group!,
    fields: [
      {
        id: 'f1',
        logbook_entry_setup_master_id: 'skill-x',
        column_name: 'Patient Reg. No',
        details_text: null,
        column_value_type: 'text',
        required_ind: 1,
        is_show: 1,
        sl_no: 1,
        options: [],
      },
      {
        id: 'f2',
        logbook_entry_setup_master_id: 'skill-x',
        column_name: 'Some Radio Field',
        details_text: null,
        column_value_type: 'radio',
        required_ind: 0,
        is_show: 1,
        sl_no: 2,
        options: [],
      },
    ],
  };

  const records = buildFieldRecordsForLeaf(leaf);

  it('applies the period-stripping transform to dynamic field names', () => {
    const regNo = records.find((r) => r.fieldKey.endsWith('::f1'));
    expect(regNo?.label).toBe('Patient Reg No');
    expect(regNo?.htmlName).toBe('Patient Reg No');
  });

  it('marks radio-type fields as not currently visible', () => {
    const radio = records.find((r) => r.fieldKey.endsWith('::f2'));
    expect(radio?.currentlyVisible).toBe(false);
    expect(radio?.helpText).toMatch(/no corresponding input/);
  });

  it('keeps competency-group checkbox names verbatim (no trim in the selector value)', () => {
    const cg = records.find((r) => r.fieldKey.includes('::cg::'));
    expect(cg?.htmlName).toBe('Competency Item ');
    expect(cg?.label).toBe('Competency Item'); // display label is trimmed for readability
  });
});

describe('findNodeById', () => {
  it('finds a node at any depth by id', () => {
    const found = findNodeById(mockTree, 'skill-x');
    expect(found?.particulars).toBe('Skill X');
  });

  it('returns null for an unknown id', () => {
    expect(findNodeById(mockTree, 'does-not-exist')).toBeNull();
  });
});
