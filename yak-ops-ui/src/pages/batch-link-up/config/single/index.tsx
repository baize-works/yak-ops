import {history, useLocation, useParams} from "@umijs/max";
import {Empty, message, Spin} from "antd";
import {useEffect, useState} from "react";
import {linkupJobDefinitionApi} from "../../api";
import Workflow from "../../workflow";
import {
  BasicConfig,
  defaultEnvConfig,
  EnvConfig,
  ScheduleConfig,
} from "../../workflow/components/ScheduleConfigContent/types";

type PageScene = "create" | "edit";

type EditorSyncState = "UNPUBLISHED" | "SYNCED" | "DIRTY";

type JobDefinitionState = {
  editorSyncState: EditorSyncState;
  releaseState?: "ONLINE" | "OFFLINE" | string;
  jobVersion?: number | null;
  contentVersion?: number | null;
};

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
  mode: "GUIDE_SINGLE",
  sourceType: "SOURCE",
  targetType: "SINK",
  sourceDataSourceId: "",
  targetDataSourceId: "",
};

const buildUnpublishedState = (): JobDefinitionState => {
  return {
    editorSyncState: "UNPUBLISHED",
    releaseState: "OFFLINE",
    jobVersion: null,
    contentVersion: null,
  };
};

const buildSyncedState = (rawState?: any): JobDefinitionState => {
  return {
    editorSyncState: "SYNCED",
    releaseState: rawState?.releaseState || "OFFLINE",
    jobVersion: rawState?.jobVersion ?? null,
    contentVersion: rawState?.contentVersion ?? null,
  };
};

const buildInitialScheduleConfigForCreate = (rawData?: any): ScheduleConfig => {
  return {
    ...defaultScheduleConfig,
    ...(rawData?.scheduleConfig || {}),
    hourlyRangeValue: {
      ...defaultScheduleConfig.hourlyRangeValue,
      ...(rawData?.scheduleConfig?.hourlyRangeValue || {}),
    },
    hourlyAppointValue: {
      ...defaultScheduleConfig.hourlyAppointValue,
      ...(rawData?.scheduleConfig?.hourlyAppointValue || {}),
    },
    dailyValue: {
      ...defaultScheduleConfig.dailyValue,
      ...(rawData?.scheduleConfig?.dailyValue || {}),
    },
    weeklyValue: {
      ...defaultScheduleConfig.weeklyValue,
      ...(rawData?.scheduleConfig?.weeklyValue || {}),
    },
  };
};

const buildInitialBasicConfigForCreate = (rawData?: any): BasicConfig => {
  return {
    ...defaultBasicConfig,
    jobName: rawData?.jobName || "",
    jobDesc: rawData?.jobDesc || "",
    clientId: rawData?.clientId || "",
    mode: rawData?.mode || "GUIDE_SINGLE",
    sourceType: rawData?.sourceType?.dbType || "SOURCE",
    targetType: rawData?.targetType?.dbType || "SINK",
    sourceDataSourceId: rawData?.sourceDataSourceId || rawData?.sourceId || "",
    targetDataSourceId: rawData?.targetDataSourceId || rawData?.targetId || "",
  };
};

const buildInitialScheduleConfigForEdit = (editData?: any): ScheduleConfig => {
  const schedule = editData?.schedule || {};

  return {
    ...defaultScheduleConfig,
    ...schedule,
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

const buildInitialBasicConfigForEdit = (editData?: any): BasicConfig => {
  const basic = editData?.basic || {};
  const workflow = editData?.workflow || {};

  return {
    ...defaultBasicConfig,
    jobName: basic?.jobName || "",
    jobDesc: basic?.jobDesc || "",
    clientId: basic?.clientId ? String(basic.clientId) : "",
    mode: basic?.mode || editData?.mode || "GUIDE_SINGLE",
    sourceType: workflow?.sourceType?.dbType || "SOURCE",
    targetType: workflow?.targetType?.dbType || "SINK",
    sourceDataSourceId:
      workflow?.sourceDataSourceId || workflow?.sourceId || "",
    targetDataSourceId:
      workflow?.targetDataSourceId || workflow?.targetId || "",
  };
};

const buildPageParamsForCreate = (rawData: any, routeId?: string) => {
  return {
    ...rawData,
    id: rawData?.id || routeId,
    __pageScene: "create",
    state: buildUnpublishedState(),
  };
};

const buildPageParamsForEdit = (editData?: any) => {
  const basic = editData?.basic || {};
  const workflow = editData?.workflow || {};
  const schedule = editData?.schedule || {};
  const env = editData?.env || {};

  return {
    id: editData?.id,
    mode: editData?.mode,
    runtimeType: editData?.runtimeType,

    jobName: basic?.jobName || "",
    jobDesc: basic?.jobDesc || "",
    clientId: basic?.clientId || "",

    sourceType: workflow?.sourceType || null,
    targetType: workflow?.targetType || null,
    sourceDataSourceId:
      workflow?.sourceDataSourceId || workflow?.sourceId || "",
    targetDataSourceId:
      workflow?.targetDataSourceId || workflow?.targetId || "",

    scheduleConfig: schedule,
    workflow,
    basic,
    schedule,
    env,

    __pageScene: "edit",
    state: editData?.state
      ? buildSyncedState(editData.state)
      : buildSyncedState({
        releaseState: editData?.releaseState,
        jobVersion: editData?.jobVersion,
        contentVersion: editData?.contentVersion,
      }),
  };
};

export default function SingleConfigPage() {
  const {id} = useParams<{ id: string }>();
  const location = useLocation();

  const [pageScene, setPageScene] = useState<PageScene>("create");
  const [params, setParams] = useState<any>(null);
  const [sourceType, setSourceType] = useState<any>(null);
  const [targetType, setTargetType] = useState<any>(null);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>(
    defaultScheduleConfig
  );
  const [envConfig, setEnvConfig] = useState<EnvConfig>(defaultEnvConfig);
  const [basicConfig, setBasicConfig] =
    useState<BasicConfig>(defaultBasicConfig);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!id) return;

    const searchParams = new URLSearchParams(location.search);
    const scene = searchParams.get("scene");
    const cacheKey = `batch-link-up-detail-${id}`;

    const initCreate = () => {
      setPageScene("create");

      const cache = sessionStorage.getItem(cacheKey);
      if (!cache) {
        setParams(null);
        return;
      }

      try {
        const data = JSON.parse(cache);
        const pageParams = buildPageParamsForCreate(data, id);

        setParams(pageParams);
        setSourceType(data?.sourceType || null);
        setTargetType(data?.targetType || null);
        setBasicConfig(buildInitialBasicConfigForCreate(data));
        setScheduleConfig(buildInitialScheduleConfigForCreate(data));
        setEnvConfig(buildInitialEnvConfigForCreate(data));
      } catch (error) {
        message.error("读取配置缓存失败，请返回重新选择数据源");
        setParams(null);
      }
    };

    const initEdit = async () => {
      try {
        setLoading(true);
        setPageScene("edit");

        const res = await linkupJobDefinitionApi.selectEditDetail(id);
        if (res?.code !== 0 || !res?.data) {
          message.error(res?.message || res?.msg || "获取编辑详情失败");
          setParams(null);
          return;
        }

        const data = res.data;
        const pageParams = buildPageParamsForEdit(data);

        setParams(pageParams);
        setSourceType(data?.workflow?.sourceType || null);
        setTargetType(data?.workflow?.targetType || null);
        setBasicConfig(buildInitialBasicConfigForEdit(data));
        setScheduleConfig(buildInitialScheduleConfigForEdit(data));
        setEnvConfig(buildInitialEnvConfigForEdit(data));
      } catch (error) {
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
      history.push(`/sync/batch-link-up`);
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

  const actualPageScene = (params?.__pageScene || pageScene) as PageScene;

  const workflowContextKey = [
    actualPageScene,
    params?.id || id || "unknown",
    params?.state?.editorSyncState ?? "none",
    params?.state?.jobVersion ?? "none",
    params?.state?.contentVersion ?? "none",
  ].join("-");

  return (
    <div className="min-h-screen bg-[#ffffff]">
      <Workflow
        pageScene={actualPageScene}
        contextKey={workflowContextKey}
        params={params}
        goBack={goBack}
        sourceType={sourceType}
        setSourceType={setSourceType}
        targetType={targetType}
        setTargetType={setTargetType}
        setParams={setParams}
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
