import type {
  ConnectorCondition,
  ConnectorFormEvaluation,
  ConnectorFormSchema,
  ConnectorFormValues,
} from './types';

export const isEmptyValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
};

const normalize = (value?: string) =>
  (value || '').trim().toUpperCase().replaceAll('-', '_');

const asString = (value: unknown) =>
  value === undefined || value === null ? '' : String(value).trim();

const asNumber = (value: unknown): number | undefined => {
  const result = Number(value);
  return Number.isFinite(result) ? result : undefined;
};

const equalsValue = (left: unknown, right: unknown): boolean => {
  if (Array.isArray(left)) return left.some((item) => equalsValue(item, right));
  if (Array.isArray(right)) return right.some((item) => equalsValue(left, item));
  const leftNumber = asNumber(left);
  const rightNumber = asNumber(right);
  if (leftNumber !== undefined && rightNumber !== undefined) {
    return leftNumber === rightNumber;
  }
  return left === right || asString(left).toLowerCase() === asString(right).toLowerCase();
};

const contains = (container: unknown, value: unknown): boolean => {
  if (Array.isArray(container)) {
    return container.some((item) => equalsValue(item, value));
  }
  if (container && typeof container === 'object') {
    return Object.entries(container as Record<string, unknown>).some(
      ([key, item]) => equalsValue(key, value) || equalsValue(item, value),
    );
  }
  return asString(container).includes(asString(value));
};

const evaluateSingle = (
  condition: ConnectorCondition,
  values: ConnectorFormValues,
): boolean => {
  const actual = condition.optionKey ? values[condition.optionKey] : undefined;
  const expected = condition.compareOptionKey
    ? values[condition.compareOptionKey]
    : condition.expectedValue;
  const operator = normalize(condition.operator);

  switch (operator) {
    case 'EQ':
    case 'EQUAL':
    case 'EQUALS':
    case 'IS':
      return equalsValue(actual, expected);
    case 'NE':
    case 'NOT_EQUAL':
    case 'NOT_EQUALS':
    case 'IS_NOT':
      return !equalsValue(actual, expected);
    case 'IN':
      return contains(expected, actual);
    case 'NOT_IN':
      return !contains(expected, actual);
    case 'CONTAINS':
      return contains(actual, expected);
    case 'NOT_CONTAINS':
      return !contains(actual, expected);
    case 'EXISTS':
    case 'PRESENT':
    case 'NOT_EMPTY':
      return !isEmptyValue(actual);
    case 'NOT_EXISTS':
    case 'ABSENT':
    case 'EMPTY':
      return isEmptyValue(actual);
    case 'TRUE':
    case 'IS_TRUE':
      return actual === true || actual === 'true' || actual === 1;
    case 'FALSE':
    case 'IS_FALSE':
      return actual === false || actual === 'false' || actual === 0;
    case 'GT':
    case 'GREATER_THAN':
      return Number(actual) > Number(expected);
    case 'GTE':
    case 'GREATER_THAN_OR_EQUAL':
      return Number(actual) >= Number(expected);
    case 'LT':
    case 'LESS_THAN':
      return Number(actual) < Number(expected);
    case 'LTE':
    case 'LESS_THAN_OR_EQUAL':
      return Number(actual) <= Number(expected);
    case 'STARTS_WITH':
      return asString(actual).startsWith(asString(expected));
    case 'ENDS_WITH':
      return asString(actual).endsWith(asString(expected));
    case 'MATCHES':
    case 'REGEX':
      try {
        return new RegExp(asString(expected)).test(asString(actual));
      } catch {
        return true;
      }
    case 'EXTENSION':
    case '':
      return true;
    default:
      return true;
  }
};

export const evaluateCondition = (
  condition: ConnectorCondition | undefined,
  values: ConnectorFormValues,
): boolean => {
  if (!condition) return true;
  const current = evaluateSingle(condition, values);
  if (!condition.next) return current;
  const next = evaluateCondition(condition.next, values);
  return normalize(condition.logicalOperator) === 'OR'
    ? current || next
    : current && next;
};

const message = (value: string | undefined, fallback: string) =>
  value?.trim() || fallback;

export const evaluateConnectorForm = (
  schema: ConnectorFormSchema,
  values: ConnectorFormValues,
): ConnectorFormEvaluation => {
  const fieldStates = Object.fromEntries(
    schema.fields.map((field) => [
      field.key,
      {
        visible: !field.hidden,
        required: field.required,
        disabled: field.readOnly,
        errors: [] as string[],
      },
    ]),
  );
  const formErrors: string[] = [];

  for (const interaction of schema.interactions || []) {
    const active = evaluateCondition(interaction.condition, values);
    const effect = normalize(interaction.effect);

    if (effect === 'VISIBLE') {
      for (const key of interaction.optionKeys) {
        if (fieldStates[key]) fieldStates[key].visible &&= active;
      }
      continue;
    }

    if (effect === 'REQUIRED' && active) {
      for (const key of interaction.optionKeys) {
        if (fieldStates[key]) fieldStates[key].required = true;
      }
      continue;
    }

    if (effect === 'DISABLED') {
      for (const key of interaction.optionKeys) {
        if (fieldStates[key]) fieldStates[key].disabled ||= active;
      }
      continue;
    }

    if (effect === 'EXCLUSIVE' && active) {
      const selected = interaction.optionKeys.filter(
        (key) => !isEmptyValue(values[key]),
      );
      if (selected.length > 1) {
        formErrors.push(
          message(interaction.message, '互斥配置只能填写其中一项'),
        );
      }
      continue;
    }

    if (effect === 'BUNDLED' && active) {
      const selected = interaction.optionKeys.filter(
        (key) => !isEmptyValue(values[key]),
      );
      if (selected.length > 0 && selected.length < interaction.optionKeys.length) {
        formErrors.push(
          message(interaction.message, '关联配置必须同时填写或同时留空'),
        );
      }
      continue;
    }

    if (effect === 'VALIDATE' && !active) {
      const error = message(
        interaction.message,
        '配置不满足 Connector 约束',
      );
      if (interaction.optionKeys.length === 1 && fieldStates[interaction.optionKeys[0]]) {
        fieldStates[interaction.optionKeys[0]].errors.push(error);
      } else {
        formErrors.push(error);
      }
    }
  }

  for (const field of schema.fields) {
    const state = fieldStates[field.key];
    if (!state?.visible) continue;
    if (state.required && isEmptyValue(values[field.key])) {
      state.errors.push(`${field.label}不能为空`);
    }
    if (
      !isEmptyValue(values[field.key]) &&
      field.allowedValues?.length > 0
    ) {
      const selected: unknown[] = Array.isArray(values[field.key])
        ? (values[field.key] as unknown[])
        : [values[field.key]];
      const invalid = selected.some(
        (value) => !field.allowedValues.some((allowed) => equalsValue(allowed, value)),
      );
      if (invalid) state.errors.push(`${field.label}包含不支持的选项`);
    }
  }

  return {
    valid:
      formErrors.length === 0 &&
      Object.values(fieldStates).every((state) => state.errors.length === 0),
    fieldStates,
    formErrors: Array.from(new Set(formErrors)),
  };
};
