import { Button, Drawer, Empty, Input, Pagination, Spin, Table } from 'antd';
import { Database, Search, X } from 'lucide-react';
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
}: RegisterTableDrawerProps) => (
  <Drawer
    title={
      <div>
        <div className="text-[16px] font-semibold text-[#161823]">
          注册数据表
        </div>
        <div className="mt-1 text-xs font-normal text-[#8a8f99]">
          从数据源插件发现表，并将需要质量管理的数据表注册到当前数据源。
        </div>
      </div>
    }
    width={960}
    open={open}
    destroyOnClose
    maskClosable={!registering}
    closable={!registering}
    onClose={onClose}
    styles={{ body: { padding: 0 }, footer: { padding: '12px 20px' } }}
    footer={
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8a8f99]">
          已选择 {selectedCandidates.size} 张数据表
        </span>
        <div className="flex items-center gap-2">
          <Button disabled={registering} onClick={onClose}>
            取消
          </Button>
          <Button
            type="primary"
            loading={registering}
            disabled={!selectedCandidates.size}
            onClick={onRegister}
          >
            注册所选数据表
          </Button>
        </div>
      </div>
    }
  >
    <div className="grid h-full min-h-[580px] grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
      <div className="flex min-w-0 flex-col border-r border-[#e8e9ec] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#161823]">
              可注册的数据表
            </div>
            <div className="mt-0.5 text-xs text-[#98a2b3]">
              数据实时来自当前数据源插件
            </div>
          </div>
          <span className="text-xs text-[#8a8f99]">
            共 {candidateTotal} 张
          </span>
        </div>

        <Input
          allowClear
          variant="filled"
          value={candidateKeyword}
          onChange={(event) => onCandidateKeywordChange(event.target.value)}
          prefix={<Search size={14} className="text-[#98a2b3]" />}
          placeholder="搜索表名或描述"
          className="mb-3"
        />

        <div className="min-h-0 flex-1 overflow-hidden">
          <Spin spinning={candidateLoading}>
            <Table<TableCandidateView>
              rowKey={tableTargetKey}
              size="small"
              pagination={false}
              dataSource={candidates}
              scroll={{ y: 410 }}
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
                  title: '表名/描述',
                  dataIndex: 'tableName',
                  render: (_, record) => (
                    <div className="min-w-0">
                      <div className="truncate font-medium text-[#161823]">
                        {record.tableName}
                      </div>
                      {record.remarks && (
                        <div className="mt-0.5 truncate text-xs text-[#8a8f99]">
                          {record.remarks}
                        </div>
                      )}
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
                  ),
                },
                {
                  title: '类型',
                  dataIndex: 'tableType',
                  width: 90,
                  render: (value) => value || '--',
                },
              ]}
            />
          </Spin>
        </div>

        {candidateTotal > 0 && (
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
        )}
      </div>

      <div className="flex min-w-0 flex-col bg-[#fafafa] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#161823]">
              已选择的数据表
            </div>
            <div className="mt-0.5 text-xs text-[#98a2b3]">
              支持跨页选择，确认后统一注册
            </div>
          </div>
          {!!selectedCandidates.size && (
            <Button type="link" size="small" onClick={onClear}>
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
                  className="flex items-start gap-2 border border-[#e4e7ec] bg-white px-3 py-2.5"
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
);

export default RegisterTableDrawer;
