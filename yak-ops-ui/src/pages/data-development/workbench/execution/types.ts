import type { ComponentType } from 'react';
import type {
  DevelopmentResource,
  ExecutionStatus,
  NodePluginDefinition,
} from '../core/types';

export type ExecutionPanelTabKey =
  | 'problems'
  | 'output'
  | 'lineage'
  | 'result'
  | 'publish'
  | 'validation'
  | 'quality';

export interface ExecutionLogEntry {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  timestamp: string;
  message: string;
}

export interface TableExecutionResult {
  kind: 'table';
  columns: Array<{
    key: string;
    title: string;
    dataType: string;
  }>;
  rows: Array<Record<string, string | number | boolean | null>>;
  affectedRows?: number;
}

export interface JsonExecutionResult {
  kind: 'json';
  statusCode: number;
  statusText: string;
  elapsedMs: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface TerminalExecutionResult {
  kind: 'terminal';
  exitCode: number;
  stdout: string[];
  stderr: string[];
}

export interface NotebookExecutionResult {
  kind: 'notebook';
  cells: Array<{
    id: string;
    label: string;
    status: 'SUCCESS' | 'FAILED';
    durationMs: number;
    output: string;
  }>;
}

export interface PipelineExecutionResult {
  kind: 'pipeline';
  processedRows: number;
  writtenRows: number;
  rejectedRows: number;
  throughput: number;
  stages: Array<{
    id: string;
    label: string;
    status: 'SUCCESS' | 'RUNNING' | 'FAILED';
    rows: number;
    durationMs: number;
  }>;
}

export interface TextExecutionResult {
  kind: 'text';
  title: string;
  value: string;
}

export type ExecutionResultPayload =
  | TableExecutionResult
  | JsonExecutionResult
  | TerminalExecutionResult
  | NotebookExecutionResult
  | PipelineExecutionResult
  | TextExecutionResult;

export interface ExecutionSession {
  id: string;
  resourceId: string;
  resourceType: string;
  resourceName: string;
  engine: string;
  status: ExecutionStatus;
  submittedAt: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  logs: ExecutionLogEntry[];
  result?: ExecutionResultPayload;
  errorMessage?: string;
}

export interface ExecutionResultDefinition {
  resourceType: string;
  rendererKey: string;
  defaultTab?: ExecutionPanelTabKey;
}

export interface ExecutionResultRendererProps {
  resource: DevelopmentResource;
  plugin: NodePluginDefinition;
  session: ExecutionSession;
  payload: ExecutionResultPayload;
}

export type ExecutionResultRendererComponent =
  ComponentType<ExecutionResultRendererProps>;
