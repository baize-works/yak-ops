import { Button, Empty, Input, Pagination, Popconfirm, Spin, Table, Tooltip } from 'antd';
import { Play, Plus, Search, Settings2 } from 'lucide-react';
import { CheckResultTag } from '../../components/QualityStatus';
import type { TableAssetView } from '../../types';
import { PAGE_SIZE, type DataSourceTreeNode } from '../model';

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
  onRun: (record: TableAssetView) => void;
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
}: RegisteredTablePanelProps) => (
  <main className="min-w-0 flex-1 overflow-hidden px-4 py-3">
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        {selectedSourceNode && (
          <div className="flex h-8 shrink-0 items-center gap-3 bg-[#f5f5f6] px-3 text-xs text-[#667085]">
            <span>
              数据源类型：
              <span className="font-medium text-[#30323b]">
                {selectedSourceNode.dataSourceType}
              </span>
            </span>
            <span className="h-3 w-px bg-[#dfe1e5]" />
            <span>
              数据源：
              <span className="font-medium text-[#30323b]">
                {selectedSourceNode.dataSourceName}
              </span>
            </span>
          </div>
        )}

        <Input
          allowClear
          variant="filled"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          prefix={<Search size={14} className="text-[#98a2b3]" />}
          placeholder="搜索已注册的表名或描述"
          className="min-w-[260px] flex-1"
        />

        <Button
          type="primary"
          icon={<Plus size={14} />}
          disabled={!dataSourceId}
          onClick={onOpenRegister}
        >
          注册数据表
        </Button>
      </div>

      {!dataSourceId ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请从左侧选择数据源"
          />
        </div>
      ) : (
        <Spin spinning={assetLoading} wrapperClassName="min-h-0 flex-1">
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-auto">
              <Table<TableAssetView>
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={assets}
                scroll={{ x: 1080 }}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="当前数据源还没有注册数据表"
                    >
                      <Button
                        type="primary"
                        icon={<Plus size={14} />}
                        onClick={onOpenRegister}
                      >
                        注册数据表
                      </Button>
                    </Empty>
                  ),
                }}
                columns={[
                  {
                    title: '表名/描述/路径',
                    dataIndex: 'tableName',
                    render: (_, record) => (
                      <div>
                        <div className="font-medium text-[#161823]">
                          {record.tableName}
                        </div>
                        {record.remarks && (
                          <div className="mt-0.5 text-xs text-[#8a8f99]">
                            {record.remarks}
                          </div>
                        )}
                        <div className="mt-0.5 text-xs text-[#98a2b3]">
                          {[
                            record.databaseName,
                            record.schemaName,
                            record.tableName,
                          ]
                            .filter(Boolean)
                            .join(' / ')}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: '监控数',
                    dataIndex: 'monitorCount',
                    width: 100,
                  },
                  {
                    title: '规则数',
                    dataIndex: 'ruleCount',
                    width: 100,
                  },
                  {
                    title: '最近结果',
                    dataIndex: 'lastResult',
                    width: 120,
                    render: (value) => <CheckResultTag value={value} />,
                  },
                  {
                    title: '最近运行',
                    dataIndex: 'lastRunTime',
                    width: 180,
                    render: (value) => value || '--',
                  },
                  {
                    title: '操作',
                    width: 300,
                    fixed: 'right',
                    render: (_, record) => (
                      <div className="flex items-center gap-1">
                        {record.monitorId ? (
                          <>
                            <Button
                              type="link"
                              size="small"
                              icon={<Settings2 size={13} />}
                              onClick={() => onOpenMonitor(record)}
                            >
                              监控详情
                            </Button>
                            <Tooltip title="手动运行">
                              <Button
                                type="text"
                                size="small"
                                icon={<Play size={14} />}
                                onClick={() => onRun(record)}
                              />
                            </Tooltip>
                          </>
                        ) : (
                          <Button
                            type="link"
                            size="small"
                            onClick={() => onOpenMonitor(record)}
                          >
                            新建质量监控
                          </Button>
                        )}

                        {record.monitorCount > 0 ? (
                          <Tooltip title="请先删除该表的质量监控">
                            <span>
                              <Button type="text" size="small" disabled>
                                取消注册
                              </Button>
                            </span>
                          </Tooltip>
                        ) : (
                          <Popconfirm
                            title="取消注册数据表"
                            description="取消后，该表将不再出现在按表配置列表中。"
                            okText="确认取消"
                            cancelText="保留"
                            onConfirm={() => onUnregister(record)}
                          >
                            <Button type="text" size="small">
                              取消注册
                            </Button>
                          </Popconfirm>
                        )}
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

export default RegisteredTablePanel;
