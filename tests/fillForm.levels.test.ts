import { resolveLevelFromValidLevels, LEVEL_CHECKBOX_NAME } from '../src/uploader/fillForm';

describe('resolveLevelFromValidLevels', () => {
  it('auto-selects the single valid level when only one is mapped and no explicit override is given (e.g. Intravenous cannulation -> 4)', () => {
    const result = resolveLevelFromValidLevels(['4']);
    expect(result.status).toBe('single-valid-level');
    expect(result.selectedLevel).toBe('4');
  });

  it('refuses to guess when more than one level is mapped and no explicit level is provided, per "do not invent level values"', () => {
    const result = resolveLevelFromValidLevels(['2', '3']);
    expect(result.status).toBe('ambiguous-multiple-levels');
    expect(result.selectedLevel).toBeNull();
    expect(result.validLevels).toEqual(['2', '3']);
  });

  it('reports no-levels-mapped when the item has no mapped levels at all (e.g. a mapping gap)', () => {
    const result = resolveLevelFromValidLevels([]);
    expect(result.status).toBe('no-levels-mapped');
    expect(result.selectedLevel).toBeNull();
  });

  it('accepts an explicit level that is valid for a multi-level item, resolving the ambiguity', () => {
    const result = resolveLevelFromValidLevels(['2', '3'], '3');
    expect(result.status).toBe('explicit-level-confirmed');
    expect(result.selectedLevel).toBe('3');
  });

  it('accepts an explicit level that matches the single valid level (redundant but not an error)', () => {
    const result = resolveLevelFromValidLevels(['4'], '4');
    expect(result.status).toBe('explicit-level-confirmed');
    expect(result.selectedLevel).toBe('4');
  });

  it('rejects an explicit level that is not in the valid set - never substitutes or guesses', () => {
    const result = resolveLevelFromValidLevels(['2', '3'], '4');
    expect(result.status).toBe('invalid-explicit-level');
    expect(result.selectedLevel).toBeNull();
  });

  it('rejects an explicit level provided for an item with no mapped levels at all', () => {
    const result = resolveLevelFromValidLevels([], '2');
    expect(result.status).toBe('invalid-explicit-level');
  });

  it('flags an unselectable level (e.g. mapped level "5" with no corresponding DOM checkbox) rather than substituting or inventing a control', () => {
    const result = resolveLevelFromValidLevels(['5']);
    expect(result.status).toBe('unselectable-level');
    expect(result.selectedLevel).toBe('5');
  });

  it('flags an unselectable level even when explicitly provided and otherwise valid', () => {
    const result = resolveLevelFromValidLevels(['5'], '5');
    expect(result.status).toBe('unselectable-level');
    expect(result.selectedLevel).toBe('5');
  });
});

describe('LEVEL_CHECKBOX_NAME', () => {
  it('maps each portal level value 1-4 to its exact DOM checkbox name', () => {
    expect(LEVEL_CHECKBOX_NAME['1']).toBe('levelOne');
    expect(LEVEL_CHECKBOX_NAME['2']).toBe('levelTwo');
    expect(LEVEL_CHECKBOX_NAME['3']).toBe('levelThree');
    expect(LEVEL_CHECKBOX_NAME['4']).toBe('levelFour');
  });

  it('has no entry for level "5" (confirmed live: no such DOM control exists)', () => {
    expect(LEVEL_CHECKBOX_NAME['5']).toBeUndefined();
  });
});
