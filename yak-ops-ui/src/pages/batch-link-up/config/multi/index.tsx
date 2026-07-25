import {history, useLocation, useParams} from "@umijs/max";
import {Empty, message, Spin} from "antd";
import {useEffect, useState} from "react";
import {linkupJobDefinitionApi} from "../../api";
import {
  BasicConfig,
  defaultEnvConfig,
  EnvConfig,
  ScheduleConfig,
} from "../../workflow/components/ScheduleConfigContent/types";
import MultiWorkflow from "./MultiWorkflow";
import {buildUnpublishedJobDefinitionState, normalizeJobDefinitionState} from "./jobDefinitionState";

const defaultScheduleConfig: ScheduleConfig = {
  paramsList: [],
  instanceGenerateMode: "nextDay",
  scheduleRunType: "pause",
  timeoutMode: "system",
  timeoutValue: 1,
  timeoutUnit: "hour",
  rerunPolicy: "success_or_fail",
  autoRetry: true,
  retryTimes: 1,
  retryInterval: 1,
  scheduleType: "day",
  hourMode: "range",
  hourlyRangeValue: {
    startTime: "00:00",
    intervalHour: 1,
    endTime: "23:59",
  },
  hourlyAppointValue: {
    hours: [0],
    minute: "00",
  },
  dailyValue: {
    time: "00:17",
  },
  weeklyValue: {
    weekdays: ["MON"],
    time: "00:17",
  },
  effectType: "forever",
  cronExpression: "0 17 0 * * ?",
};

const defaultBasicConfig: BasicConfig = {
  jobName: "",
  jobDesc: "",
  clientId: "",
  mode: "GUIDE_MULTI",
  sourceType: "SOURCE",
  targetType: "SINK",
  sourceDataSourceId: "",
  targetDataSourceId: "",
};

const mergeScheduleConfig = (schedule?: any): ScheduleConfig => {
  return {
    ...defaultScheduleConfig,
    ...(schedule || {}),
    hourlyRangeValue: {
      ...defaultScheduleConfig.hourlyRangeValue,
      ...(schedule?.hourlyRangeValue || {}),
    },
    hourlyAppointValue: {
      ...defaultScheduleConfig.hourlyAppointValue,
      ...(schedule?.hourlyAppointValue || {}),
    },
    dailyValue: {
      ...defaultScheduleConfig.dailyValue,
      ...(schedule?.dailyValue || {}),
    },
    weeklyValue: {
      ...defaultScheduleConfig.weeklyValue,
      ...(schedule?.weeklyValue || {}),
    },
  };
};

const buildInitialScheduleConfigForCreate = (
  rawData?: any
): ScheduleConfig => {
  return mergeScheduleConfig(rawData?.scheduleConfig || rawData?.schedule);
};

const buildInitialScheduleConfigForEdit = (
  editData?: any
): ScheduleConfig => {
  return mergeScheduleConfig(editData?.schedule);
};

const buildInitialEnvConfigForCreate = (rawData?: any): EnvConfig => {
  return {
    ...defaultEnvConfig,
    ...(rawData?.env || rawData?.envConfig || {}),
  };
};

const buildInitialEnvConfigForEdit = (editData?: any): EnvConfig => {
  return {
    ...defaultEnvConfig,
    ...(editData?.env || {}),
  };
};

const buildInitialBasicConfigForCreate = (rawData?: any): BasicConfig => {
  return {
    ...defaultBasicConfig,
    jobName: rawData?.jobName || "",
    jobDesc: rawData?.jobDesc || "",
    clientId: rawData?.clientId || "",
    mode: rawData?.mode || "GUIDE_MULTI",
    sourceType: rawData?.sourceType?.dbType || "SOURCE",
    targetType: rawData?.targetType?.dbType || "SINK",
    sourceDataSourceId: rawData?.sourceDataSourceId || rawData?.sourceId || "",
    targetDataSourceId: rawData?.targetDataSourceId || rawData?.targetId || "",
  };
};

const buildInitialBasicConfigForEdit = (editData?: any): BasicConfig => {
  const basic = editData?.basic || {};
  const workflow = editData?.workflow || {};
  const content = editData?.content || {};

  const source = workflow?.source || content?.source || {};
  const target = workflow?.target || content?.target || {};

  return {
    ...defaultBasicConfig,
    jobName: basic?.jobName || "",
    jobDesc: basic?.jobDesc || "",
    clientId: basic?.clientId ? String(basic.clientId) : "",
    mode: basic?.mode || editData?.mode || "GUIDE_MULTI",

    sourceType:
      workflow?.sourceType?.dbType ||
      source?.dbType ||
      editData?.sourceType?.dbType ||
      "SOURCE",

    targetType:
      workflow?.targetType?.dbType ||
      target?.dbType ||
      editData?.targetType?.dbType ||
      "SINK",

    sourceDataSourceId:
      workflow?.sourceDataSourceId ||
      workflow?.sourceId ||
      source?.datasourceId ||
      "",

    targetDataSourceId:
      workflow?.targetDataSourceId ||
      workflow?.targetId ||
      target?.datasourceId ||
      "",
  };
};

const buildPageParamsForCreate = (rawData?: any) => {
  return {
    ...(rawData || {}),
    mode: rawData?.mode || "GUIDE_MULTI",
    state: normalizeJobDefinitionState(
      rawData?.state || buildUnpublishedJobDefinitionState()
    ),
    workflow: {
      ...(rawData?.workflow || {}),
    },
    basic: {
      ...(rawData?.basic || {}),
    },
    schedule: rawData?.schedule || rawData?.scheduleConfig,
    env: rawData?.env || rawData?.envConfig,
  };
};

const buildPageParamsForEdit = (editData?: any) => {
  const basic = editData?.basic || {};
  const workflow = editData?.workflow || {};
  const content = editData?.content || {};
  const schedule = editData?.schedule || {};
  const env = editData?.env || {};

  const source = workflow?.source || content?.source || {};
  const target = workflow?.target || content?.target || {};

  return {
    id: editData?.id,
    mode: editData?.mode || basic?.mode || "GUIDE_MULTI",
    jobName: basic?.jobName || "",
    jobDesc: basic?.jobDesc || "",
    clientId: basic?.clientId || "",

    state: normalizeJobDefinitionState(editData?.state),

    sourceType:
      workflow?.sourceType ||
      editData?.sourceType || {
        dbType: source?.dbType,
        connectorType: source?.connectorType,
        pluginName: source?.pluginName,
      },

    targetType:
      workflow?.targetType ||
      editData?.targetType || {
        dbType: target?.dbType,
        connectorType: target?.connectorType,
        pluginName: target?.pluginName,
      },

    sourceDataSourceId:
      workflow?.sourceDataSourceId ||
      workflow?.sourceId ||
      source?.datasourceId ||
      "",

    targetDataSourceId:
      workflow?.targetDataSourceId ||
      workflow?.targetId ||
      target?.datasourceId ||
      "",

    scheduleConfig: schedule,
    workflow: {
      ...workflow,
      ...content,
    },
    basic,
    content,
    env,
  };
};

export default function MultiConfigPage() {
  const {id} = useParams<{ id: string }>();
  const location = useLocation();

  const [params, setParams] = useState<any>(null);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>(
    defaultScheduleConfig
  );
  const [envConfig, setEnvConfig] = useState<EnvConfig>(defaultEnvConfig);
  const [basicConfig, setBasicConfig] =
    useState<BasicConfig>(defaultBasicConfig);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const searchParams = new URLSearchParams(location.search);
    const scene = searchParams.get("scene");
    const cacheKey = `batch-link-up-detail-${id}`;

    const initCreate = () => {
      const cache = sessionStorage.getItem(cacheKey);
      if (!cache) {
        setParams(null);
        return;
      }

      try {
        const data = JSON.parse(cache);
        const pageParams = buildPageParamsForCreate(data);

        setParams(pageParams);
        setBasicConfig(buildInitialBasicConfigForCreate(data));
        setScheduleConfig(buildInitialScheduleConfigForCreate(data));
        setEnvConfig(buildInitialEnvConfigForCreate(data));
      } catch (error) {
        console.error("解析缓存失败:", error);
        message.error("读取缓存配置失败");
        setParams(null);
      }
    };

    const initEdit = async () => {
      try {
        setLoading(true);

        const res = await linkupJobDefinitionApi.selectEditDetail(id);
        if (res?.code !== 0 || !res?.data) {
          message.error(res?.message || res?.msg || "获取编辑详情失败");
          setParams(null);
          return;
        }

        const data = res.data;

        setParams(buildPageParamsForEdit(data));
        setBasicConfig(buildInitialBasicConfigForEdit(data));
        setScheduleConfig(buildInitialScheduleConfigForEdit(data));
        setEnvConfig(buildInitialEnvConfigForEdit(data));
      } catch (error) {
        console.error(error);
        message.error("获取编辑详情失败");
        setParams(null);
      } finally {
        setLoading(false);
      }
    };

    if (scene === "edit") {
      initEdit();
      return;
    }

    if (scene === "create") {
      initCreate();
      return;
    }

    const cache = sessionStorage.getItem(cacheKey);
    if (cache) {
      initCreate();
    } else {
      initEdit();
    }
  }, [id, location.search]);

  const goBack = () => {
    const searchParams = new URLSearchParams(location.search);
    const scene = searchParams.get("scene");

    if (scene === "edit") {
      history.push("/sync/batch-link-up");
      return;
    }

    history.push(`/sync/batch-link-up/${id}/detail`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <Spin/>
      </div>
    );
  }

  if (!params) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <Empty description="未找到配置数据，请检查任务是否存在"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <MultiWorkflow
        params={params}
        setParams={setParams}
        goBack={goBack}
        basicConfig={basicConfig}
        setBasicConfig={setBasicConfig}
        scheduleConfig={scheduleConfig}
        setScheduleConfig={setScheduleConfig}
        envConfig={envConfig}
        setEnvConfig={setEnvConfig}
      />
    </div>
  );
}
