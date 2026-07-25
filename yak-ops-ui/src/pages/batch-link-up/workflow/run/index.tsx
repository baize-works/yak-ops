import {Client} from "@stomp/stompjs";
import {message} from "antd";
import type {FC, ReactNode} from "react";
import {memo, useEffect, useMemo, useRef, useState} from "react";
import SockJS from "sockjs-client";
import CloseIcon from "../icon/CloseIcon";
import {linkupJobDefinitionApi, linkupJobExecuteApi} from "../../api";
import "./index.less";

interface RunLogProps {
  setRunVisible: (value: boolean) => void;
  runVisible?: boolean;
  footer?: ReactNode;
  baseForm?: any;
  params?: any;
}

type LinkupJobMetricsPO = {
  id?: string | number | null;
  jobInstanceId?: number;
  jobDefinitionId?: number;
  pipelineId: number;

  readRowCount: number;
  writeRowCount: number;
  readQps: number;
  writeQps: number;

  readBytes?: number;
  writeBytes?: number;
  readBps?: number;
  writeBps?: number;

  intermediateQueueSize?: number;
  lagCount?: number;
  lossRate?: number;
  avgRowSize?: number;
  recordDelay?: number;

  status?: string;
  errorMsg?: string | null;

  createTime?: string | null;
  updateTime?: string | null;
};

type TableMetricsPO = LinkupJobMetricsPO & {
  sourceTable?: string;
  sinkTable?: string;
};

type MetricsMessage = {
  type: "METRICS";
  instanceId: number;
  engineId: string | number;
  timestamp?: number;

  /**
   * 后端当前实际返回字段
   */
  pipelineMetrics?: Record<string, LinkupJobMetricsPO>;

  /**
   * 兼容旧字段，避免以后字段名变化导致前端直接挂掉
   */
  metrics?: Record<string, LinkupJobMetricsPO>;

  /**
   * 表级指标
   */
  tableMetrics?: TableMetricsPO[];
};

type JobStatusMessage = {
  type: "JOB_STATUS";
  instanceId: number;
  engineId: string | number;
  status: "RUNNING" | "FINISHED" | "FAILED" | string;
  timestamp?: number;
};

type LogEntryType = "log" | "metric" | "error";

type LogEntry = {
  id: number;
  content: string;
  timestamp: string;
  type: LogEntryType;
  sortKey: number;
  data?: MetricsMessage;
};

const CONNECT_TIMEOUT = 5000;
const WS_URL = "http://127.0.0.1:9527/ws";
const WS_TOPIC = "/topic/log/test";

const RunLog: FC<RunLogProps> = ({
                                   setRunVisible,
                                   runVisible,
                                   footer,
                                   baseForm,
                                   params,
                                 }) => {
  const [panelHeight, setPanelHeight] = useState(460);
  const [isDragging, setIsDragging] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState("未连接");

  const logsContainerRef = useRef<HTMLDivElement>(null);
  const stompClientRef = useRef<Client | null>(null);
  const connectTimerRef = useRef<number | null>(null);

  const metricsCacheRef = useRef<Map<number, { data: MetricsMessage; timestamp: number }>>(new Map());

  const panelStyle = useMemo(
    () => ({
      height: `${panelHeight}px`,
    }),
    [panelHeight]
  );

  const addLogEntry = (
    content: string,
    type: LogEntryType = "log",
    data?: MetricsMessage
  ) => {
    const now = Date.now();

    const newEntry: LogEntry = {
      id: now + Math.floor(Math.random() * 1000),
      content,
      timestamp: new Date().toLocaleTimeString(),
      type,
      data,
      sortKey: now,
    };

    setLogEntries((prev) => {
      if (type === "metric" && data?.instanceId != null) {
        metricsCacheRef.current.set(data.instanceId, {
          data,
          timestamp: now,
        });
      }

      return [...prev, newEntry].slice(-200);
    });
  };

  const getPipelineMetricsMap = (
    data?: MetricsMessage
  ): Record<string, LinkupJobMetricsPO> | undefined => {
    return data?.pipelineMetrics || data?.metrics;
  };

  const getFirstPipeline = (
    metrics?: Record<string, LinkupJobMetricsPO>
  ): LinkupJobMetricsPO | null => {
    if (!metrics) return null;

    const keys = Object.keys(metrics);
    if (!keys.length) return null;

    const firstKey = keys.sort((a, b) => Number(a) - Number(b))[0];
    return metrics[firstKey] || null;
  };

  const getFirstTableMetric = (data?: MetricsMessage): TableMetricsPO | null => {
    if (!data?.tableMetrics?.length) return null;
    return data.tableMetrics[0] || null;
  };

  const isDuplicateMetric = (data: MetricsMessage) => {
    const cached = metricsCacheRef.current.get(data.instanceId);
    if (!cached) return false;

    const currPipeline = getFirstPipeline(getPipelineMetricsMap(data));
    const prevPipeline = getFirstPipeline(getPipelineMetricsMap(cached.data));

    if (!currPipeline || !prevPipeline) return false;

    const currTable = getFirstTableMetric(data);
    const prevTable = getFirstTableMetric(cached.data);

    return (
      currPipeline.readRowCount === prevPipeline.readRowCount &&
      currPipeline.writeRowCount === prevPipeline.writeRowCount &&
      currPipeline.readQps === prevPipeline.readQps &&
      currPipeline.writeQps === prevPipeline.writeQps &&
      currPipeline.intermediateQueueSize ===
      prevPipeline.intermediateQueueSize &&
      (currPipeline.status ?? "") === (prevPipeline.status ?? "") &&
      (currTable?.status ?? "") === (prevTable?.status ?? "")
    );
  };

  const formatTableText = (tableMetric?: TableMetricsPO | null) => {
    if (!tableMetric?.sourceTable && !tableMetric?.sinkTable) {
      return "";
    }

    return `, Table ${tableMetric?.sourceTable || "-"} → ${
      tableMetric?.sinkTable || "-"
    }`;
  };

  const formatStatusText = (tableMetric?: TableMetricsPO | null) => {
    if (!tableMetric?.status) return "";
    return `, Status ${tableMetric.status}`;
  };

  const handleMetricsData = (data: MetricsMessage) => {
    const now = Date.now();

    const payload: MetricsMessage = {
      ...data,
      timestamp: data.timestamp ?? now,
    };

    if (isDuplicateMetric(payload)) {
      metricsCacheRef.current.set(payload.instanceId, {
        data: payload,
        timestamp: now,
      });
      return;
    }

    const pipeline = getFirstPipeline(getPipelineMetricsMap(payload));
    const tableMetric = getFirstTableMetric(payload);

    if (!pipeline) {
      addLogEntry(
        `METRICS received but pipelineMetrics map empty: ${JSON.stringify(
          payload
        )}`,
        "error"
      );
      return;
    }

    addLogEntry(
      `Instance ${payload.instanceId} - Pipeline ${
        pipeline.pipelineId
      }${formatTableText(tableMetric)}: Read ${pipeline.readRowCount ?? 0} (${
        pipeline.readQps ?? 0
      } QPS), Write ${pipeline.writeRowCount ?? 0} (${
        pipeline.writeQps ?? 0
      } QPS), Queue ${pipeline.intermediateQueueSize ?? 0}${formatStatusText(
        tableMetric
      )};`,
      "metric",
      payload
    );
  };

  const clearConnectTimer = () => {
    if (connectTimerRef.current) {
      window.clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
  };

  const disconnect = () => {
    clearConnectTimer();

    if (stompClientRef.current) {
      addLogEntry("Disconnecting WebSocket connection.", "log");
      void stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }

    setConnectionStatus("已断开");
    addLogEntry("WebSocket Disconnected", "log");
    metricsCacheRef.current.clear();
  };

  const connect = async () => {
    if (!params?.id) {
      message.warning("缺少任务定义ID，请先发布任务");
      addLogEntry("Missing job definition id.", "error");
      return;
    }

    setLogEntries([]);
    metricsCacheRef.current.clear();
    setConnectionStatus("连接中");
    addLogEntry("Connecting WebSocket Server...", "log");

    const socket = new SockJS(WS_URL);

    const stompClient = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 0,

      onConnect: async () => {
        clearConnectTimer();

        setConnectionStatus("已连接");
        addLogEntry("WebSocket Connected", "log");

        try {
          void (baseForm?.getFieldsValue?.() || {});

          const detailResp = await linkupJobDefinitionApi.selectById(
            params?.id
          );

          if (detailResp?.code !== 0) {
            message.error("请先发布");
            addLogEntry("Job definition not published.", "error");
            return;
          }

          const execResp = await linkupJobExecuteApi.execute(params?.id);

          if (execResp?.code !== 0) {
            addLogEntry(
              `Backend execute error: ${
                execResp?.msg || execResp?.message || "unknown"
              }`,
              "error"
            );
            return;
          }

          addLogEntry(`Task submitted successfully. jobId=${params?.id}`, "log");

          stompClient.subscribe(WS_TOPIC, (msg) => {
            let data: any;

            try {
              data = JSON.parse(msg.body);
            } catch {
              addLogEntry(`JSON parse failed: ${msg.body}`, "error");
              return;
            }

            try {
              if (data?.type === "METRICS") {
                handleMetricsData(data as MetricsMessage);
                return;
              }

              if (data?.type === "JOB_STATUS") {
                const status = (data as JobStatusMessage)?.status;

                if (status === "FINISHED") {
                  setConnectionStatus("已完成");
                  addLogEntry("Task finished successfully.", "log");
                } else if (status === "FAILED") {
                  setConnectionStatus("失败");
                  addLogEntry("Task finished with failure.", "error");
                } else if (status === "RUNNING") {
                  setConnectionStatus("运行中");
                } else {
                  addLogEntry(JSON.stringify(data), "log");
                }

                return;
              }

              if (typeof data === "string") {
                addLogEntry(data, "log");
              } else {
                addLogEntry(JSON.stringify(data), "log");
              }
            } catch (e: any) {
              addLogEntry(
                `Handle message failed: ${e?.message || String(e)}`,
                "error"
              );
            }
          });
        } catch (error: any) {
          addLogEntry(
            `Initialize run failed: ${error?.message || "unknown error"}`,
            "error"
          );
        }
      },

      onStompError: (error) => {
        clearConnectTimer();
        setConnectionStatus("连接异常");
        addLogEntry(
          `STOMP Error: ${error.headers?.message || "unknown"}`,
          "error"
        );
      },

      onWebSocketClose: () => {
        clearConnectTimer();
        setConnectionStatus("已断开");
        addLogEntry("WebSocket Closed", "log");
      },
    });

    connectTimerRef.current = window.setTimeout(() => {
      addLogEntry("WebSocket Connection timeout", "error");
      message.error("WebSocket Connection timeout");
      setConnectionStatus("连接超时");
      void stompClient.deactivate();
    }, CONNECT_TIMEOUT);

    stompClient.activate();
    stompClientRef.current = stompClient;
  };

  useEffect(() => {
    if (!runVisible) return;

    void connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runVisible, params?.id]);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop =
        logsContainerRef.current.scrollHeight;
    }
  }, [logEntries]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);

    const startY = e.clientY;
    const startHeight = panelHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.max(280, Math.min(720, startHeight + deltaY));
      setPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const getLogBadgeText = (type: LogEntryType) => {
    if (type === "metric") return "METRIC";
    if (type === "error") return "ERROR";
    return "LOG";
  };

  const getLogItemClassName = (type: LogEntryType) => {
    if (type === "metric") {
      return "run-log__log-item run-log__log-item--metric";
    }

    if (type === "error") {
      return "run-log__log-item run-log__log-item--error";
    }

    return "run-log__log-item run-log__log-item--log";
  };

  const latestMetricData = Array.from(metricsCacheRef.current.values()).sort(
    (a, b) => b.timestamp - a.timestamp
  )[0]?.data;

  const latestPipeline = getFirstPipeline(
    getPipelineMetricsMap(latestMetricData)
  );

  const latestTableMetric = getFirstTableMetric(latestMetricData);

  const totalSynced = latestPipeline
    ? latestPipeline.writeRowCount ?? latestPipeline.readRowCount ?? 0
    : "--";

  const readQps = latestPipeline?.readQps ?? 0;
  const writeQps = latestPipeline?.writeQps ?? 0;
  const qpsText = latestPipeline ? `${readQps}/${writeQps}` : "--/--";

  const statusText = latestTableMetric?.status || connectionStatus;

  if (!runVisible) {
    return null;
  }

  return (
    <div className="run-log">
      <div className="run-log__container">
        <div
          className={`run-log__resize-bar ${
            isDragging ? "run-log__resize-bar--active" : ""
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className="run-log__resize-handle"/>
        </div>

        <section className="run-log__drawer" style={panelStyle}>
          <header className="run-log__header">
            <div className="run-log__header-main">
              <div className="run-log__header-meta">
                <div className="run-log__header-icon">志</div>

                <div className="run-log__header-text">
                  <div className="run-log__header-title">运行日志</div>
                  <div className="run-log__header-subtitle">{statusText}</div>
                </div>
              </div>

              <div className="run-log__header-stats">
                <div className="run-log__header-stat">
                  <span className="run-log__header-stat-label">同步总量</span>
                  <span className="run-log__header-stat-value">
                    {totalSynced}
                  </span>
                </div>

                <div className="run-log__header-stat">
                  <span className="run-log__header-stat-label">QPS</span>
                  <span className="run-log__header-stat-value">{qpsText}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="run-log__close"
              onClick={() => setRunVisible(false)}
              aria-label="关闭运行日志面板"
            >
              <CloseIcon/>
            </button>
          </header>

          <div className="run-log__body">
            <div className="run-log__section">
              <div className="run-log__log-wrap" ref={logsContainerRef}>
                {logEntries.length === 0 ? (
                  <div className="run-log__log-empty">
                    <div className="run-log__log-empty-title">暂无日志</div>
                    <div className="run-log__log-empty-desc">
                      等待任务启动后显示运行输出
                    </div>
                  </div>
                ) : (
                  logEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={getLogItemClassName(entry.type)}
                    >
                      <span className="run-log__log-badge">
                        {getLogBadgeText(entry.type)}
                      </span>

                      <span className="run-log__log-time">
                        [{entry.timestamp}]
                      </span>

                      <span className="run-log__log-text" title={entry.content}>
                        {entry.content}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {footer ? (
            <footer className="run-log__footer">{footer}</footer>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default memo(RunLog);
