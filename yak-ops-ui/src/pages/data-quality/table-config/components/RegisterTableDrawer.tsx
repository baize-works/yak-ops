import {
  Button,
  ConfigProvider,
  Drawer,
  Empty,
  Input,
  Pagination,
  Spin,
  Table,
  Tag,
} from 'antd';
import { Database, Search, X } from 'lucide-react';

import { BRAND_THEME } from '@/styles/brand';

import { dataQualityTableClassName } from '../../components/tableStyle';
import type { TableCandidateView } from '../../types';
import { CANDIDATE_PAGE_SIZE, tableTargetKey } from '../model';

interface RegisterTableDrawerProps {
  open: boolean;
  registering: boolean;
  candidates: TableCandidateView[];
  candidateTotal: number;
  candidateCurrent: number;
  candidateKeyword: string;
  candidateLoading: boolean;
  selectedCandidates: Map<string, TableCandidateView>;
  selectedCandidateKeys: string[];
  selectedCandidateRecords: TableCandidateView[];
  onClose: () => void;
  onRegister: () => void;
  onCandidateCurrentChange: (current: number) => void;
  onCandidateKeywordChange: (keyword: string) => void;
  onSelect: (record: TableCandidateView, selected: boolean) => void;
  onSelectAll: (
    selected: boolean,
    changedRows: TableCandidateView[],
  ) => void;
  onClear: () => void;
}

const RegisterTableDrawer = ({
  open,
  registering,
  candidates,
  candidateTotal,
  candidateCurrent,
  candidateKeyword,
  candidateLoading,
  selectedCandidates,
  selectedCandidateKeys,
  selectedCandidateRecords,
  onClose,
  onRegister,
  onCandidateCurrentChange,
  onCandidateKeywordChange,
  onSelect,
  onSelectAll,
  onClear,
}: RegisterTableDrawerProps) => {
  const selectedCount = selectedCandidates.size;

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <Drawer
        open={open}
        width={960}
        placement="right"
        closable={false}
        destroyOnClose
        maskClosable={!registering}
        keyboard={!registering}
        onClose={onClose}
        title={
          <div className="min-w-0">
            <div className="text-[18px] font-semibold leading-7 text-[#101828]">
              注册数据表
            </div>
          </div>
        }
        extra={
          <div className="flex shrink-0 items-center gap-2">
            <div className="mr-2 whitespace-nowrap text-[13px] text-[#667085]">
              已选择
              <span className="mx-1 font-semibold text-[#101828]">
                {selectedCount}
              </span>
              张
            </div>

            <Button
              disabled={registering}
              onClick={onClose}
              className="!h-9 !rounded-lg !px-4 !font-medium"
            >
              取消
            </Button>

            <Button
              type="primary"
              loading={registering}
              disabled={!selectedCount}
              onClick={onRegister}
              className="!h-9 !rounded-lg !px-5 !font-medium "
            >
              注册所选数据表
            </Button>
          </div>
        }
        styles={{
          header: {
            padding: '18px 24px',
            borderBottom: '1px solid #eaecf0',
          },
          body: {
            padding: 0,
            overflow: 'hidden',
          },
        }}
      >
        <div className="grid h-full min-h-[580px] grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
          <div className="flex min-w-0 flex-col border-r border-[#e8e9ec] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#161823]">
                可注册的数据表
              </div>

              <span className="text-xs text-[#8a8f99]">
                共 {candidateTotal} 张
              </span>
            </div>

            <Input
              allowClear
              variant="filled"
              value={candidateKeyword}
              onChange={(event) =>
                onCandidateKeywordChange(event.target.value)
              }
              prefix={<Search size={14} className="text-[#98a2b3]" />}
              placeholder="搜索表名或描述"
              className="mb-3"
            />

            <div className="min-h-0 flex-1 overflow-hidden">
              <Spin spinning={candidateLoading}>
                <Table<TableCandidateView>
                  rowKey={tableTargetKey}
                  size="small"
                  bordered
                  pagination={false}
                  dataSource={candidates}
                  scroll={{ y: 410 }}
                  className={dataQualityTableClassName()}
                  rowSelection={{
                    preserveSelectedRowKeys: true,
                    selectedRowKeys: selectedCandidateKeys,
                    onSelect,
                    onSelectAll: (selected, _rows, changedRows) =>
                      onSelectAll(selected, changedRows),
                  }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="没有可注册的数据表"
                      />
                    ),
                  }}
                  columns={[
                    {
                      title: '表名 / 描述 / 路径',
                      dataIndex: 'tableName',
                      render: (_, record) => (
                        <div className="min-w-0 py-1">
                          <div className="truncate font-medium text-[#172033]">
                            {record.tableName}
                          </div>

                          {record.remarks ? (
                            <div className="mt-1 truncate text-xs text-[#667085]">
                              {record.remarks}
                            </div>
                          ) : null}

                          <div className="mt-1 truncate text-[11px] text-[#98a2b3]">
                            路径：
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
                      title: '表类型',
                      dataIndex: 'tableType',
                      width: 100,
                      render: (value) => (
                        <Tag className="!m-0 !border-0 !bg-[#f2f4f7] !text-[#667085]">
                          {value || 'TABLE'}
                        </Tag>
                      ),
                    },
                  ]}
                />
              </Spin>
            </div>

            {candidateTotal > 0 ? (
              <div className="mt-3 flex shrink-0 justify-end">
                <Pagination
                  size="small"
                  current={candidateCurrent}
                  pageSize={CANDIDATE_PAGE_SIZE}
                  total={candidateTotal}
                  showSizeChanger={false}
                  onChange={onCandidateCurrentChange}
                />
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col bg-[#fafafa] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#161823]">
                已选择的数据表
              </div>

              {!!selectedCount && (
                <Button
                  type="link"
                  size="small"
                  disabled={registering}
                  onClick={onClear}
                  className="!px-0"
                >
                  清空
                </Button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {selectedCandidateRecords.length ? (
                <div className="space-y-2">
                  {selectedCandidateRecords.map((record) => (
                    <div
                      key={tableTargetKey(record)}
                      className="flex items-start gap-2 rounded-lg border border-[#e4e7ec] bg-white px-3 py-2.5"
                    >
                      <Database
                        size={14}
                        className="mt-0.5 shrink-0 text-[#667085]"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-[#161823]">
                          {record.tableName}
                        </div>

                        <div className="mt-0.5 truncate text-xs text-[#98a2b3]">
                          {[
                            record.databaseName,
                            record.schemaName,
                            record.tableName,
                          ]
                            .filter(Boolean)
                            .join(' / ')}
                        </div>
                      </div>

                      <Button
                        type="text"
                        size="small"
                        disabled={registering}
                        aria-label={`移除 ${record.tableName}`}
                        icon={<X size={14} />}
                        onClick={() => onSelect(record, false)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="尚未选择数据表"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Drawer>
    </ConfigProvider>
  );
};

export default RegisterTableDrawer;