export const transformRules = (rules: any[] | undefined): any[] => {
  if (!rules) return [];
  return rules.map((rule) => {
    const formRule: any = {message: rule.message};
    if (rule.required === true) formRule.required = true;
    return formRule;
  });
};

export const getConfigInitialValues = (fields: any[]) => {
  const initialValues: Record<string, any> = {};

  fields.forEach((field) => {
    initialValues[field.key] = parseDefaultValueByType(field);
  });

  return initialValues;
};

const parseDefaultValueByType = (field: any) => {
  const value = field.defaultValue;

  if (value === undefined || value === null || value === "") {
    if (field.type === "CUSTOM_SELECT") {
      return [];
    }
    return value;
  }

  switch (field.type) {
    case "NUMBER":
      return Number(value);

    case "SWITCH":
      if (typeof value === "boolean") return value;
      return value === "true" || value === true;

    case "CUSTOM_SELECT":
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error(`Failed to parse defaultValue for ${field.key}`, e);
          return [];
        }
      }
      return [];

    default:
      return value;
  }
};

/** 只给“当前为空”的字段补默认值 */
export const patchEmptyWithDefaults = (
  current: Record<string, any>,
  init: Record<string, any>
) => {
  const patch: Record<string, any> = {};
  Object.keys(init).forEach((k) => {
    const cur = current?.[k];
    if (cur === undefined || cur === null || cur === "") patch[k] = init[k];
  });
  return patch;
};
