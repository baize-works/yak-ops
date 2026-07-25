import type {FormInstance} from "antd";

export type SyncMode = "GUIDE_SINGLE" | "GUIDE_MULTI" | "SCRIPT";
export type StepKey = "base" | "client";

export type ClientItem = {
  id: string;
  name: string;
  type: string;
  status?: "online" | "offline" | "untested";
};

export type SourceTargetType = {
  dbType: string;
  connectorType?: string;
  pluginName?: string;
};

interface DataSourceOptionItem {
  id?: string;
  name?: string;
  label?: string;
  value?: string;

  [key: string]: any;
}

export type DetailFormValues = {
  jobName?: string;
  jobDesc?: string;
  mode?: SyncMode;
};

export type DetailPageState = {
  params: any;
  sourceType: SourceTargetType;
  targetType: SourceTargetType;
  activeStep: StepKey;
  sourceClientId?: string;
  targetClientId?: string;
  clientIds: string[];
};

export type UseDetailPageReturn = {
  form: FormInstance<DetailFormValues>;
  params: any;
  sourceType: SourceTargetType;
  targetType: SourceTargetType;
  activeStep: StepKey;
  sourceClientId?: string;
  targetClientId?: string;
  clientIds: string[];
  sourceLabel: string;
  targetLabel: string;
  mode?: SyncMode;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  baseSectionRef: React.RefObject<HTMLDivElement | null>;
  clientSectionRef: React.RefObject<HTMLDivElement | null>;
  setSourceClientId: (id?: string) => void;
  setTargetClientId: (id?: string) => void;
  setClientIds: (ids: string[]) => void;
  handleSourceChange: (value: string, option: any) => void;
  handleTargetChange: (value: string, option: any) => void;
  goBack: () => void;
  handleNext: () => Promise<void>;
};
