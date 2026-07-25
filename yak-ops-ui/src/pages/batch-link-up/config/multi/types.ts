import type {ReactNode} from "react";
import React from "react";
import {BasicConfig, ScheduleConfig} from "../../workflow/components/ScheduleConfigContent/types";

export interface WholeSyncTaskDraft {
  source: {
    dbType: string;
    connectorType: string;
    datasourceId: string;
    pluginName: string;
    fetchSize: number;
    splitSize: number;
  };
  target: {
    dbType: string;
    connectorType: string;
    datasourceId: string;
    pluginName: string;
    dataSaveMode: any;
    batchSize: any;
    schemaSaveMode: any;
    enableUpsert: boolean;
    fieldIde: string;
  };
  tableMatch: {
    mode: "1" | "2" | "3" | "4";
    keyword?: string;
    tables?: string[];
  };
}


export interface DbTypeValue {
  dbType?: string;
  connectorType?: string;
  pluginName?: string;
}

export interface MultiWorkflowProps {
  params: any;
  goBack: () => void;
  basicConfig: BasicConfig;
  setBasicConfig: React.Dispatch<React.SetStateAction<BasicConfig>>;
  scheduleConfig: ScheduleConfig;
  setScheduleConfig: (value: any) => void;
}

export type RightPanelTab = "basic" | "schedule" | "mapping" | "advanced" | null;


export interface TableItem {
  key: string;
  title: ReactNode;
  rawTitle: string;
  chosen?: boolean;
}

export interface DbType {
  dbType: string;
  connectorType: string;
  pluginName: string;
}
