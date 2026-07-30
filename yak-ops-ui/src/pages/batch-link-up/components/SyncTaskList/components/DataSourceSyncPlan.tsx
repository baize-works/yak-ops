import { API_SUCCESS_CODE } from '@/services/http/response';
import { fetchDataSourceDetail } from "@/pages/data-source/service";
import { DoubleRightOutlined } from "@ant-design/icons";
import { Empty, Popover } from "antd";
import { CSSProperties, useState } from "react";
import DatabaseIcons from "../../../../data-source/icon/DatabaseIcons";

interface DataSourceSyncPlanProps {
  record: any;
}

const DataSourceSyncPlan: React.FC<DataSourceSyncPlanProps> = ({ record }) => {
  console.log(record);
  const animatedIconStyle: CSSProperties = {
    fontSize: 10,
    animation: "float 2s ease-in-out infinite",
  };

  const [sourcePopoverVisible, setSourcePopoverVisible] = useState(false);
  const [sinkPopoverVisible, setSinkPopoverVisible] = useState(false);
  const [jsonData, setJsonData] = useState<any>(null); // Store the JSON data

  const safeParse = (value: any) => {
    if (!value) return null;

    if (typeof value === "object") {
      return value;
    }

    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }

    return null;
  };

  const renderJsonPopoverContent = () => {
  if (!jsonData) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
    );
  }

  const renderValue = (value: any): React.ReactNode => {
    if (value === null) {
      return <span className="text-gray-400">null</span>;
    }

    if (typeof value === "string") {
      return <span className="text-emerald-600">"{value}"</span>;
    }

    if (typeof value === "number") {
      return <span className="text-amber-500">{value}</span>;
    }

    if (typeof value === "boolean") {
      return (
        <span className={value ? "text-blue-600" : "text-red-500"}>
          {String(value)}
        </span>
      );
    }

    return <span className="text-gray-700">{String(value)}</span>;
  };

  const renderObject = (obj: any, level = 0): React.ReactNode => {
    if (typeof obj !== "object" || obj === null) {
      return renderValue(obj);
    }

    const isArray = Array.isArray(obj);
    const indent = level * 14;

    return (
      <div>
        {/* 开括号 */}
        <div style={{ paddingLeft: indent }} className="text-gray-400">
          {isArray ? "[" : "{"}
        </div>

        {/* 内容 */}
        <div>
          {Object.entries(obj).map(([key, value]) => (
            <div
              key={key}
              style={{ paddingLeft: indent + 14 }}
              className="leading-5"
            >
              {!isArray && (
                <>
                  <span className="text-purple-600">"{key}"</span>
                  <span className="text-gray-400">: </span>
                </>
              )}

              {typeof value === "object" && value !== null ? (
                renderObject(value, level + 1)
              ) : (
                renderValue(value)
              )}
            </div>
          ))}
        </div>

        {/* 闭括号 */}
        <div style={{ paddingLeft: indent }} className="text-gray-400">
          {isArray ? "]" : "}"}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[340px] max-h-[320px] overflow-auto text-xs font-mono bg-gradient-to-br from-gray-50 to-white p-3 rounded-xl border border-gray-200 shadow-sm">
      {renderObject(jsonData)}
    </div>
  );
};

  const formatTables = (tableValue: any, fallback?: string) => {
    if (!tableValue) return fallback || "-";

    if (typeof tableValue === "string") {
      const trimmed = tableValue.trim();

      if (!trimmed) return fallback || "-";

      // 普通单表名，直接返回
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        return trimmed;
      }

      const parsed = safeParse(trimmed);
      if (!parsed) return fallback || trimmed;
      tableValue = parsed;
    }

    // 数组格式：["t1", "t2"]
    if (Array.isArray(tableValue)) {
      if (tableValue.length === 0) return fallback || "-";
      if (tableValue.length === 1) return tableValue[0];
      return `${tableValue[0]} +${tableValue.length - 1} more`;
    }

    // 对象格式：{schema1:["t1","t2"], schema2:["t3"]}
    if (typeof tableValue === "object") {
      const allTables: string[] = [];

      Object.values(tableValue).forEach((value: any) => {
        if (Array.isArray(value)) {
          allTables.push(...value);
        } else if (typeof value === "string" && value.trim()) {
          allTables.push(value.trim());
        }
      });

      if (allTables.length === 0) return fallback || "-";
      if (allTables.length === 1) return allTables[0];
      return `${allTables[0]} +${allTables.length - 1} more`;
    }

    return fallback || "-";
  };

  const getPlanTitle = () => {
    if (record?.jobType === "BATCH") {
      if (record?.mode === "GUIDE_SINGLE") return "单表同步";
      if (record?.mode === "GUIDE_MULTI") return "多表同步";
      if (record?.mode === "SCRIPT") return "脚本模式";
      return "Batch Sync";
    }

    return "数据同步";
  };

  const sourceTableText = formatTables(
    record?.sourceTable,
    record?.mode === "GUIDE_SINGLE" ? "Single Table" : "Not Configured"
  );

  const sinkTableText = formatTables(
    record?.sinkTable,
    record?.mode === "GUIDE_SINGLE" ? "Single Table" : "Not Configured"
  );

  const getTableCount = (tableValue: any) => {
    if (!tableValue) return 0;

    let value = tableValue;

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (!trimmed) return 0;

      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        return 1;
      }

      const parsed = safeParse(trimmed);
      if (!parsed) return 1;

      value = parsed;
    }

    if (Array.isArray(value)) {
      return value.filter((item) => String(item || "").trim()).length;
    }

    if (typeof value === "object") {
      return Object.values(value).reduce((total: number, item: any) => {
        if (Array.isArray(item)) {
          return total + item.filter((v) => String(v || "").trim()).length;
        }

        if (typeof item === "string" && item.trim()) {
          return total + 1;
        }

        return total;
      }, 0);
    }

    return 0;
  };

  const sourceTableCount = getTableCount(record?.sourceTable);
  const sinkTableCount = getTableCount(record?.sinkTable);

  const getTableList = (tableValue: any): string[] => {
    if (!tableValue) return [];

    let value = tableValue;

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (!trimmed) return [];

      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        return [trimmed];
      }

      const parsed = safeParse(trimmed);
      if (!parsed) return [trimmed];

      value = parsed;
    }

    if (Array.isArray(value)) {
      return value
        .filter((item) => String(item || "").trim())
        .map((item) => String(item).trim());
    }

    if (typeof value === "object") {
      const tables: string[] = [];

      Object.entries(value).forEach(([schemaName, item]: any) => {
        if (Array.isArray(item)) {
          item.forEach((tableName) => {
            if (String(tableName || "").trim()) {
              tables.push(
                schemaName
                  ? `${schemaName}.${String(tableName).trim()}`
                  : String(tableName).trim()
              );
            }
          });
        }

        if (typeof item === "string" && item.trim()) {
          tables.push(
            schemaName ? `${schemaName}.${item.trim()}` : item.trim()
          );
        }
      });

      return tables;
    }

    return [];
  };

  const sourceTableList = getTableList(record?.sourceTable);
  const sinkTableList = getTableList(record?.sinkTable);

  const renderTablePopoverContent = (tables: string[]) => {
    if (!tables.length) {
      return (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无表信息" />
      );
    }

    return (
      <div style={{ width: 300, maxHeight: 280, overflowY: "auto" }}>
        <div
          style={{
            marginBottom: 8,
            color: "rgba(0,0,0,0.45)",
            fontSize: 12,
          }}
        >
          共 {tables.length} 张表
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {tables.map((tableName, index) => (
            <div
              key={`${tableName}-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 8,
                background: "#f5f7ff",
                color: "rgba(0,0,0,0.74)",
                fontSize: 12,
                lineHeight: "18px",
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.7)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={tableName}
              >
                {tableName}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ color: "rgba(0,0,0,0.74)", fontWeight: 500 }}>
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(90deg); }
            50% { transform: translateY(-8px) rotate(90deg); }
          }
        `}
      </style>

      <div style={{ marginBottom: 12 }}>
        <span
          className="
    inline-flex items-center gap-1.5 rounded-full
    border border-violet-100 bg-violet-50/70
    px-3 py-1 text-[11px] font-medium 
    shadow-sm shadow-violet-100/40
  "
          style={{ color: "hsl(231 48% 48%)" }}
        >
          <span
            className="h-1 w-1 rounded-full "
            style={{ backgroundColor: "hsl(231 48% 48%)" }}
          />
          {getPlanTitle()}
        </span>
      </div>

      <div style={{ margin: "4px 0" }}>
        {/* SOURCE */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {record?.sourceType ? (
            <>
              <DatabaseIcons
                dbType={record.sourceType}
                width="24"
                height="24"
              />
              <Popover
                open={sourcePopoverVisible}
                onVisibleChange={(visible) => setSourcePopoverVisible(visible)}
                title="数据源信息"
                content={renderJsonPopoverContent()}
                trigger="click"
                placement="right"
              >
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    fetchDataSourceDetail(record?.sourceDatasourceId).then(
                      (data) => {
                        if (data?.code === API_SUCCESS_CODE) {
                          setJsonData(
                            safeParse(data?.data?.originalJson || {})
                          );
                          setSourcePopoverVisible(true);
                        }
                      }
                    );
                  }}
                  style={{
                    marginLeft: 8,
                    cursor: "pointer",
                    color: "hsl(231 48% 48%)",
                  }}
                >
                  {record.sourceDatasourceName}
                </a>
              </Popover>
            </>
          ) : (
            <span>-</span>
          )}

          <span style={{ margin: "0 6px", color: "green" }}>·</span>

          {record?.mode === "GUIDE_MULTI" ? (
            <Popover
              placement="rightTop"
              trigger="hover"
              title="来源表清单"
              content={renderTablePopoverContent(sourceTableList)}
            >
              <span
                style={{
                  maxWidth: 180,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  cursor: "pointer",
                  color:
                    sourceTableCount > 0
                      ? "hsl(231 48% 48%)"
                      : "rgba(0,0,0,0.45)",
                }}
              >
                {sourceTableCount > 0
                  ? `共 ${sourceTableCount} 张表`
                  : "暂未选择表"}
              </span>
            </Popover>
          ) : (
            <span
              style={{
                maxWidth: 180,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
              title={String(sourceTableText)}
            >
              {sourceTableText}
            </span>
          )}
        </div>

        {/* ARROW */}
        <div style={{ margin: "8px 0", paddingLeft: 7 }}>
          <DoubleRightOutlined style={animatedIconStyle} />
        </div>

        {/* SINK */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {record?.sinkType ? (
            <>
              <DatabaseIcons dbType={record.sinkType} width="24" height="24" />
              <Popover
                open={sinkPopoverVisible}
                onVisibleChange={(visible) => setSinkPopoverVisible(visible)}
                title="数据源信息"
                content={renderJsonPopoverContent()}
                trigger="click"
                placement="right"
              >
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    fetchDataSourceDetail(record?.sinkDatasourceId).then(
                      (data) => {
                        if (data?.code === API_SUCCESS_CODE) {
                          setJsonData(
                            safeParse(data?.data?.originalJson || {})
                          );
                          setSinkPopoverVisible(true);
                        }
                      }
                    );
                  }}
                  style={{
                    marginLeft: 8,
                    cursor: "pointer",
                    color: "hsl(231 48% 48%)",
                  }}
                >
                  {record.sinkDatasourceName}
                </a>
              </Popover>
            </>
          ) : (
            <span>-</span>
          )}

          <span style={{ margin: "0 6px" }}>·</span>

          {record?.mode === "GUIDE_MULTI" ? (
            <Popover
              placement="rightTop"
              trigger="hover"
              title="目标表清单"
              content={renderTablePopoverContent(sinkTableList)}
            >
              <span
                style={{
                  maxWidth: 180,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  cursor: "pointer",
                  color:
                    sinkTableCount > 0
                      ? "hsl(231 48% 48%)"
                      : "rgba(0,0,0,0.45)",
                }}
              >
                {sinkTableCount > 0
                  ? `共 ${sinkTableCount} 张表`
                  : "暂未选择表"}
              </span>
            </Popover>
          ) : (
            <span
              style={{
                maxWidth: 180,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
              title={String(sinkTableText)}
            >
              {sinkTableText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataSourceSyncPlan;
