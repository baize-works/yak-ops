export interface MetricsData {
  type: string;
  instanceId: number;
  engineId: string;
  vertexCount: number;
  vertices: Record<string,
    {
      readRowCount: number;
      writeRowCount: number;
      readQps: number;
      writeQps: number;
      status: string;
    }>;
  timestamp?: number;
}

export interface LogEntry {
  id: number;
  content: string;
  timestamp: string;
  type: "log" | "metric";
  data?: MetricsData;
  sortKey: number;
}
