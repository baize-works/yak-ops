import type { Rule } from 'antd/es/form';

import type { DynamicFormField, DynamicFormFieldRule } from '../../../types';

export const transformRules = (
  rules: DynamicFormFieldRule[] | undefined,
  fieldType?: DynamicFormField['type'],
): Rule[] => {
  if (!rules) return [];

  return rules.map((rule) => {
    const formRule: Rule = {
      message: rule.message,
      ...(fieldType === 'NUMBER' ? { type: 'number' as const } : {}),
    };
    if (rule.required === true) formRule.required = true;
    if (typeof rule.min === 'number') formRule.min = rule.min;
    if (typeof rule.max === 'number') formRule.max = rule.max;
    if (rule.pattern) {
      try {
        formRule.pattern = new RegExp(rule.pattern);
      } catch {
        // 后端插件配置错误时不让整个表单崩溃，服务端仍会再次校验。
      }
    }
    return formRule;
  });
};

export const getConfigInitialValues = (fields: DynamicFormField[]) => {
  const initialValues: Record<string, unknown> = {};
  fields.forEach((field) => {
    initialValues[field.key] = parseDefaultValueByType(field);
  });
  return initialValues;
};

const parseDefaultValueByType = (field: DynamicFormField) => {
  const value = field.defaultValue;
  if (value === undefined || value === null || value === '') {
    return field.type === 'CUSTOM_SELECT' ? [] : value;
  }

  switch (field.type) {
    case 'NUMBER':
      return Number(value);
    case 'SWITCH':
      return typeof value === 'boolean' ? value : value === 'true';
    case 'CUSTOM_SELECT':
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    default:
      return value;
  }
};

/** 只给当前为空的字段补默认值。 */
export const patchEmptyWithDefaults = (
  current: Record<string, unknown>,
  defaults: Record<string, unknown>,
) => {
  const patch: Record<string, unknown> = {};
  Object.keys(defaults).forEach((key) => {
    const value = current?.[key];
    if (value === undefined || value === null || value === '') {
      patch[key] = defaults[key];
    }
  });
  return patch;
};
