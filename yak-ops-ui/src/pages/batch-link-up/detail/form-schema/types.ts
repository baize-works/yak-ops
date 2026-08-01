export type ConnectorRole = 'SOURCE' | 'SINK';

export interface ConnectorCondition {
  optionKey?: string;
  operator?: string;
  expectedValue?: unknown;
  compareOptionKey?: string;
  extensionDescription?: string;
  logicalOperator?: 'AND' | 'OR' | string;
  next?: ConnectorCondition;
}

export interface ConnectorInteraction {
  id: string;
  effect: 'VISIBLE' | 'REQUIRED' | 'DISABLED' | 'EXCLUSIVE' | 'BUNDLED' | 'VALIDATE' | string;
  optionKeys: string[];
  condition?: ConnectorCondition;
  message?: string;
}

export interface ConnectorOptionSource {
  action: string;
  searchable: boolean;
  multiple: boolean;
  cacheTtlMillis: number;
  requestValueKeys: string[];
}

export interface ConnectorFormField {
  key: string;
  label: string;
  description?: string;
  help?: string;
  placeholder?: string;
  valueType: string;
  javaType?: string;
  elementType?: string;
  defaultValue?: unknown;
  allowedValues: unknown[];
  fallbackKeys: string[];
  required: boolean;
  sensitive: boolean;
  semanticType?: string;
  scope?: string;
  groupId: string;
  order: number;
  importance?: string;
  widget: string;
  hidden: boolean;
  readOnly: boolean;
  valueSource?: string;
  dependsOn: string[];
  clearWhenHidden: boolean;
  optionSource?: ConnectorOptionSource;
}

export interface ConnectorFormGroup {
  id: string;
  title: string;
  order: number;
  collapsed: boolean;
  hidden: boolean;
}

export interface ConnectorFormSchema {
  connectorId: string;
  role: ConnectorRole;
  schemaVersion?: string;
  schemaFingerprint?: string;
  profileVersion?: string;
  formFingerprint?: string;
  source?: 'REMOTE' | 'CACHE' | string;
  stale: boolean;
  syncedAt?: string;
  capabilities: string[];
  groups: ConnectorFormGroup[];
  fields: ConnectorFormField[];
  interactions: ConnectorInteraction[];
  rules?: unknown;
  warnings: string[];
}

export type ConnectorFormValues = Record<string, unknown>;

export interface ConnectorFieldState {
  visible: boolean;
  required: boolean;
  disabled: boolean;
  errors: string[];
}

export interface ConnectorFormEvaluation {
  valid: boolean;
  fieldStates: Record<string, ConnectorFieldState>;
  formErrors: string[];
}

export interface ConnectorActionOption {
  value: unknown;
  label: string;
  description?: string;
  meta?: Record<string, unknown>;
}

export interface ConnectorActionResult {
  options?: ConnectorActionOption[];
  data?: unknown;
}

export interface ConnectorValidationResult {
  valid: boolean;
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
  normalizedValues: ConnectorFormValues;
}
