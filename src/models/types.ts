export interface OptionDescriptor {
  text: string;
  value: string;
  selected: boolean;
  disabled: boolean;
}

export interface FieldRecord {
  fieldKey: string;
  label: string;
  normalizedLabel: string;
  section: string | null;
  subsection: string | null;
  controlType: string;
  htmlName: string | null;
  htmlId: string | null;
  role: string | null;
  primarySelector: string;
  fallbackSelectors: string[];
  required: boolean;
  initiallyVisible: boolean;
  currentlyVisible: boolean;
  enabled: boolean;
  readonly: boolean;
  placeholder: string | null;
  defaultValue: string | null;
  helpText: string | null;
  minLength: number | null;
  maxLength: number | null;
  minValue: string | null;
  maxValue: string | null;
  dateRestriction: string | null;
  parentPath: string;
  appearsWhen: string;
  requiredWhen: string;
  options: OptionDescriptor[] | null;
}

export interface DependencyRecord {
  parentPath: string;
  controllingField: string;
  selectedOptionText: string;
  selectedOptionValue: string;
  affectedField: string;
  effect: 'options-changed' | 'appeared' | 'disappeared' | 'became-required' | 'became-optional' | 'enabled' | 'disabled';
  beforeState: string;
  afterState: string;
  evidence: string;
}

export interface CombinationPathRecord {
  pathId: string;
  path: { field: string; value: string }[];
  status: 'success' | 'failed' | 'pending';
  reason: string | null;
}

export interface StateFingerprint {
  url: string;
  selections: Record<string, string>;
  fieldSignature: string;
}
