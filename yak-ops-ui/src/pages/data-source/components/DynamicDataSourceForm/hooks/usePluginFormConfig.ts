import type {FormInstance} from "antd";
import {useEffect, useState} from "react";
import {fetchPluginConfig} from "../services/pluginConfig";
import {getConfigInitialValues, patchEmptyWithDefaults} from "../utils/formUtils";


export function usePluginFormConfig(params: {
  dbType: string;
  configForm: FormInstance;
  intl: any;
}) {
  const {dbType, configForm, intl} = params;

  const [formConfig, setFormConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        const response = await fetchPluginConfig(dbType);

        if (cancelled) return;

        if (response?.code === 0) {
          const fields = response?.data?.formFields || [];
          console.log(formConfig);
          setFormConfig(fields);

          const init = getConfigInitialValues(fields);
          const current = configForm.getFieldsValue(true);
          const patch = patchEmptyWithDefaults(current, init);

          if (Object.keys(patch).length) configForm.setFieldsValue(patch);
        } else {

        }
      } catch {

      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [dbType]);

  return {formConfig, loading};
}
