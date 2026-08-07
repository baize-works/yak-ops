import YakOpsEmpty from "@/components/YakOpsEmpty";
import { DownOutlined, PlayCircleOutlined } from "@ant-design/icons";
import {
  Button,
  Dropdown,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Spin,
  Table,
  Tag,
  Tooltip,
  message,
  type MenuProps,
} from "antd";
import { Eye, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { useState, type Key } from "react";
import { CheckResultTag } from "../../components/QualityStatus";
import { dataQualityTableClassName } from "../../components/tableStyle";
import type { TableAssetView } from "../../types";
import { PAGE_SIZE, type DataSourceTreeNode } from "../model";

interface RegisteredTablePanelProps {
  dataSourceId?: number;
  selectedSourceNode?: DataSourceTreeNode;
  assets: TableAssetView[];
  assetTotal: number;
  assetCurrent: number;
  keyword: string;
  assetLoading: boolean;
  onAssetCurrentChange: (current: number) => void;
  onKeywordChange: (keyword: string) => void;
  onOpenRegister: () => void;
  onOpenMonitor: (record: TableAssetView) => void;
  onRun: (record: TableAssetView) => void | Promise<void>;
  onUnregister: (record: TableAssetView) => void;
}

const RegisteredTablePanel = ({
  dataSourceId,
  selectedSourceNode,
  assets,
  assetTotal,
  assetCurrent,
  keyword,
  assetLoading,
  onAssetCurrentChange,
  onKeywordChange,
  onOpenRegister,
  onOpenMonitor,
  onRun,
  onUnregister,
}: RegisteredTablePanelProps) => {
  const [runningRecordId, setRunningRecordId] = useState<Key | null>(null);

  const handleRun = async (record: TableAssetView) => {
    if (!record.monitorId) {
      message.warning("请先新建质量监控，再执行运行操作");
      return;
    }

    try {
      setRunningRecordId(record.id);
      await onRun(record);
    } finally {
      setRunningRecordId(null);
    }
  };

  const getActionItems = (
    record: TableAssetView
  ): NonNullable<MenuProps["items"]> => {
    const items: NonNullable<MenuProps["items"]> = [];

    if (record.monitorId) {
      items.push(
        {
          key: "detail",
          icon: <Eye size={14} />,
          label: "查看详情",
        },
        {
          key: "edit",
          icon: <Settings2 size={14} />,
          label: "编辑配置",
        }
      );
    } else {
      items.push({
        key: "create",
        icon: <Settings2 size={14} />,
        label: "新建质量监控",
      });
    }

    items.push(
      {
        type: "divider",
      },
      {
        key: "unregister",
        danger: true,
        disabled: record.monitorCount > 0,
        icon: <Trash2 size={14} />,
        label:
          record.monitorCount > 0 ? (
            <Tooltip title="请先删除该表的质量监控" placement="left">
              <span className="block w-full">取消注册</span>
            </Tooltip>
          ) : (
            "取消注册"
          ),
      }
    );

    return items;
  };

  const handleActionClick = (record: TableAssetView, key: Key) => {
    if (key === "detail" || key === "edit" || key === "create") {
      onOpenMonitor(record);
      return;
    }

    if (key !== "unregister" || record.monitorCount > 0) {
      return;
    }

    Modal.confirm({
      title: "取消注册数据表",
      content: "取消后，该表将不再出现在按表配置列表中。",
      okText: "确认取消",
      cancelText: "保留",
      okButtonProps: { danger: true },
      onOk: () => onUnregister(record),
    });
  };

  return (
    <main className="min-w-0 flex-1 overflow-hidden px-4 py-3">
      <div className="flex h-full flex-col overflow-hidden">
        <div className="mb-3 flex shrink-0 flex-col gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Input
              allowClear
              variant="filled"
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              prefix={<Search size={14} className="text-[#98a2b3]" />}
              placeholder="请输入关键字查表"
              className="min-w-[260px] flex-1"
            />

            <Button
              type="primary"
              disabled={!dataSourceId}
              onClick={onOpenRegister}
              className="shrink-0"
            >
              注册数据表
            </Button>
          </div>

          {selectedSourceNode && (
            <div className="flex min-h-6 flex-wrap items-center gap-2">
              <div className="inline-flex h-6 items-center rounded-sm bg-[#f5f5f6] px-2 text-xs text-[#667085]">
                数据源类型：
                <span className="ml-1 font-medium text-[#475467]">
                  {selectedSourceNode.dataSourceType}
                </span>
              </div>

              <div className="inline-flex h-6 min-w-0 items-center rounded-sm bg-[#f5f5f6] px-2 text-xs text-[#667085]">
                数据源：
                <span className="ml-1 max-w-[260px] truncate font-medium text-[#475467]">
                  {selectedSourceNode.dataSourceName}
                </span>
              </div>
            </div>
          )}
        </div>

        {!dataSourceId ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <YakOpsEmpty />
          </div>
        ) : (
          <Spin spinning={assetLoading} wrapperClassName="min-h-0 flex-1">
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-auto">
                <Table<TableAssetView>
                  rowKey="id"
                  size="small"
                  bordered
                  pagination={false}
                  dataSource={assets}
                  scroll={{ x: 1280 }}
                  className={dataQualityTableClassName()}
                  locale={{
                    emptyText: (
                      <div
                        style={{ display: "flex", justifyContent: "center" }}
                      >
                        <YakOpsEmpty />{" "}
                      </div>
                    ),
                  }}
                  columns={[
                    {
                      title: "表名 / 描述 / 路径",
                      dataIndex: "tableName",
                      minWidth: 330,
                      render: (_, record) => (
                        <div className="min-w-0 py-1">
                          <div className="truncate font-medium text-[#172033]">
                            {record.tableName}
                          </div>
                          {record.remarks ? (
                            <div className="mt-1 line-clamp-1 text-xs text-[#667085]">
                              {record.remarks}
                            </div>
                          ) : null}
                          <div className="mt-1 truncate text-[11px] text-[#98a2b3]">
                            {[
                              record.databaseName,
                              record.schemaName,
                              record.tableName,
                            ]
                              .filter(Boolean)
                              .join(" / ")}
                          </div>
                        </div>
                      ),
                    },
                    {
                      title: "数据源 / 类型",
                      width: 190,
                      render: (_, record) => (
                        <div className="space-y-1 py-0.5">
                          <div className="truncate text-[#344054]">
                            {record.dataSourceName}
                          </div>
                          <Tag className="!m-0 !border-0 !bg-[#f2f4f7] !text-[11px] !text-[#667085]">
                            {record.tableType || "TABLE"}
                          </Tag>
                        </div>
                      ),
                    },
                    {
                      title: "质量配置",
                      width: 170,
                      render: (_, record) => (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <span className="text-[#98a2b3]">监控数：</span>
                          <span className="font-medium text-[#344054]">
                            {record.monitorCount}
                          </span>
                          <span className="text-[#98a2b3]">规则数：</span>
                          <span className="font-medium text-[#344054]">
                            {record.ruleCount}
                          </span>
                        </div>
                      ),
                    },
                    {
                      title: "最近状态",
                      width: 190,
                      render: (_, record) => (
                        <div className="space-y-1.5 py-0.5">
                          <CheckResultTag value={record.lastResult} />
                          <div className="text-[11px] text-[#98a2b3]">
                            {record.lastRunTime || "暂无运行记录"}
                          </div>
                        </div>
                      ),
                    },
                    {
                      title: "注册信息",
                      width: 190,
                      render: (_, record) => (
                        <div className="space-y-1 text-xs">
                          <div className="text-[#344054]">
                            {record.registeredBy}
                          </div>
                          <div className="text-[#98a2b3]">
                            {record.registeredAt}
                          </div>
                        </div>
                      ),
                    },
                    {
                      title: "操作",
                      width: 174,
                      fixed: "right",
                      render: (_, record) => (
                        <div
                          className="flex items-center gap-1 whitespace-nowrap"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Tooltip
                            title={
                              record.monitorId ? undefined : "请先新建质量监控"
                            }
                          >
                            <Popconfirm
                              title="运行质量监控"
                              description="确认立即运行当前数据表的质量监控吗？"
                              okText="确认"
                              cancelText="取消"
                              disabled={!record.monitorId}
                              okButtonProps={{
                                loading: runningRecordId === record.id,
                              }}
                              onConfirm={() => handleRun(record)}
                            >
                              <Button
                                size="small"
                                color={record.monitorId ? "primary" : "default"}
                                variant="filled"
                                loading={runningRecordId === record.id}
                                aria-disabled={!record.monitorId}
                                icon={<PlayCircleOutlined />}
                                className={[
                                  "!h-7 !rounded-md !px-2.5 !text-xs",
                                  !record.monitorId
                                    ? "!cursor-not-allowed !text-[#98a2b3]"
                                    : "",
                                ].join(" ")}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!record.monitorId) {
                                    message.warning(
                                      "请先新建质量监控，再执行运行操作"
                                    );
                                  }
                                }}
                              >
                                运行
                              </Button>
                            </Popconfirm>
                          </Tooltip>

                          <Dropdown
                            trigger={["click"]}
                            placement="bottomRight"
                            overlayStyle={{ minWidth: 138 }}
                            menu={{
                              items: getActionItems(record),
                              onClick: ({ key, domEvent }) => {
                                domEvent.stopPropagation();
                                handleActionClick(record, key);
                              },
                            }}
                          >
                            <Button
                              size="small"
                              color="default"
                              variant="text"
                              className="!h-7 !rounded-md !px-2 !text-xs !text-[#667085]"
                              onClick={(event) => event.stopPropagation()}
                            >
                              更多
                              <DownOutlined className="text-[9px]" />
                            </Button>
                          </Dropdown>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>

              {assetTotal > 0 && (
                <div className="flex shrink-0 justify-end border-t border-[#f0f0f1] px-3 py-3">
                  <Pagination
                    size="small"
                    current={assetCurrent}
                    pageSize={PAGE_SIZE}
                    total={assetTotal}
                    showSizeChanger={false}
                    showTotal={(total) => `共 ${total} 张已注册表`}
                    onChange={onAssetCurrentChange}
                  />
                </div>
              )}
            </div>
          </Spin>
        )}
      </div>
    </main>
  );
};

export default RegisteredTablePanel;
