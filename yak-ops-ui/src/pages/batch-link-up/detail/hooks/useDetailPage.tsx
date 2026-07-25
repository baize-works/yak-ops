import {history, useParams} from "@umijs/max";
import {Form, message} from "antd";
import {useEffect, useMemo, useRef, useState} from "react";
import {getDbLabel} from "../constants";
import type {DetailFormValues, SourceTargetType, StepKey} from "../types";

const defaultSourceType: SourceTargetType = {
  dbType: "MYSQL",
  connectorType: "Jdbc",
  pluginName: "JDBC-MYSQL",
};

const defaultTargetType: SourceTargetType = {
  dbType: "MYSQL",
  connectorType: "Jdbc",
  pluginName: "Jdbc-MYSQL",
};

export default function useDetailPage() {
  const {id} = useParams<{ id: string }>();
  const [form] = Form.useForm<DetailFormValues>();

  const [params, setParams] = useState<any>(null);
  const [sourceType, setSourceType] =
    useState<SourceTargetType>(defaultSourceType);
  const [targetType, setTargetType] =
    useState<SourceTargetType>(defaultTargetType);
  const [activeStep, setActiveStep] = useState<StepKey>("base");

  const [sourceClientId, setSourceClientId] = useState<string>();
  const [targetClientId, setTargetClientId] = useState<string>();
  const [clientId, setClientId] = useState<string>();

  const [mode, setMode] = useState<any>("GUIDE_SINGLE");

  const scrollRef = useRef<HTMLDivElement>(null);
  const baseSectionRef = useRef<HTMLDivElement>(null);
  const clientSectionRef = useRef<HTMLDivElement>(null);

  const [sourceTestStatus, setSourceTestStatus] = useState<any>("idle");
  const [targetTestStatus, setTargetTestStatus] = useState<any>("idle");

  const [sourceDataSourceId, setSourceDataSourceId] = useState<string>();
  const [targetDataSourceId, setTargetDataSourceId] = useState<string>();

  useEffect(() => {
    if (!id) return;

    const cache = sessionStorage.getItem(`batch-link-up-detail-${id}`);
    if (!cache) return;

    const data = JSON.parse(cache);
    setParams(data);

    if (data?.sourceType) setSourceType(data.sourceType);
    if (data?.targetType) setTargetType(data.targetType);

    const currentMode = data?.mode || "GUIDE_SINGLE";

    form.setFieldsValue({
      jobName:
        data?.jobName ||
        `${data?.sourceType?.dbType?.toLowerCase()}2${data?.targetType?.dbType?.toLowerCase()}`,
      jobDesc: data?.jobDesc || "",
      mode: currentMode,
    });

    setMode(currentMode);

    setSourceClientId(data?.sourceClientId);
    setTargetClientId(data?.targetClientId);
    setClientId(data?.clientId);
  }, [id, form]);

  const sourceLabel = useMemo(() => getDbLabel(sourceType), [sourceType]);
  const targetLabel = useMemo(() => getDbLabel(targetType), [targetType]);

  const goBack = () => {
    history.push("/sync/batch-link-up");
  };

  const handleSourceChange = (value: string, option: any) => {
    setSourceType({
      dbType: value,
      connectorType: option?.connectorType,
      pluginName: option?.pluginName,
    });
  };

  const handleTargetChange = (value: string, option: any) => {
    setTargetType({
      dbType: value,
      connectorType: option?.connectorType,
      pluginName: option?.pluginName,
    });
  };

  const handleModeChange = (value: string) => {
    setMode(value);
    form.setFieldValue("mode", value);
  };

  const goStep = async (step: StepKey) => {
    if (step === "base") {
      setActiveStep("base");
      scrollRef.current?.scrollTo?.({top: 0, behavior: "smooth"});
      return;
    }

    try {
      await form.validateFields(["jobName", "mode"]);
      const currentMode = form.getFieldValue("mode");
      if (currentMode) {
        setMode(currentMode);
      }

      setActiveStep("client");
      scrollRef.current?.scrollTo?.({top: 0, behavior: "smooth"});
    } catch (error) {
      console.log(error);
    }
  };

  const handleNext = async () => {
    if (activeStep === "base") {
      try {
        await form.validateFields(["jobName", "mode"]);

        const currentMode = form.getFieldValue("mode");
        if (currentMode) {
          setMode(currentMode);
        }

        setActiveStep("client");
        scrollRef.current?.scrollTo?.({top: 0, behavior: "smooth"});
      } catch (error) {
        console.log(error);
      }
      return;
    }

    try {
      await form.validateFields();

      const currentMode = form.getFieldValue("mode") || mode;
      const values = form.getFieldsValue(true);

      const merged = {
        ...params,
        ...values,
        mode: currentMode,
        sourceType,
        targetType,
        sourceClientId,
        targetClientId,
        clientId,
        sourceDataSourceId,
        targetDataSourceId,
        sourceTestStatus,
        targetTestStatus,
      };

      if (id) {
        sessionStorage.setItem(
          `batch-link-up-detail-${id}`,
          JSON.stringify(merged)
        );

        if (currentMode === "GUIDE_SINGLE") {
          history.push(`/sync/batch-link-up/${id}/config/single?scene=create`);
          return;
        }

        if (currentMode === "GUIDE_MULTI") {
          history.push(`/sync/batch-link-up/${id}/config/multi?scene=create`);
          return;
        }

        if (currentMode === "SCRIPT") {
          history.push(`/sync/batch-link-up/${id}/config/script?scene=create`);
          return;
        }
      }

      message.success("配置已保存");
    } catch (error) {
      console.log(error);
    }
  };

  return {
    form,
    params,
    sourceType,
    targetType,
    activeStep,
    sourceClientId,
    targetClientId,
    clientId,
    sourceLabel,
    targetLabel,
    mode,
    scrollRef,
    baseSectionRef,
    clientSectionRef,
    setActiveStep,
    setSourceClientId,
    setTargetClientId,
    setClientId,
    handleSourceChange,
    handleTargetChange,
    handleModeChange,
    goBack,
    goStep,
    handleNext,
    sourceTestStatus,
    targetTestStatus,
    setSourceTestStatus,
    setTargetTestStatus,
    sourceDataSourceId,
    targetDataSourceId,
    setSourceDataSourceId,
    setTargetDataSourceId,
  };
}
