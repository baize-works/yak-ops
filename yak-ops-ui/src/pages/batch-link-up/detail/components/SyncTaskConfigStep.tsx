import {
  ArrowRightOutlined,
  DatabaseOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
  Segmented,
  Select,
  Spin,
  Switch,
  Tag,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { DataSourceRecord } from '@/pages/data-source/types';
import { dataSourceCatalogApi } from '@/pages/data-source/service';
import {
  endpointNode,
  updateEndpointConfig,
  type SyncEditorState,
} from '../model';

interface SyncTaskConfigStepProps {
  editor: SyncEditorState;
  dataSources: DataSourceRecord[];
  onChange: (value: SyncEditorState) => void;
  onBackToConnection: () => void;
}

const normalizeTableNames = (data: any): string[] => {
  const values = Array.isArray(data)
    ? data
    : Array.isArray(data?.bizData)
      ? data.bizData
      : Array.isArray(data?.records)
        ? data.records
        : [];

  return Array.from(
    new Set(
      values
        .map((item: any) =>
          typeof item === 'string'
            ? item
            : item?.tableName || item?.name || item?.label || item?.value,
        )
        .filter(Boolean)
        .map(String),
    ),
  );
};

const dataSourceLabel = (
  records: DataSourceRecord[],
  id: string,
): { name: string; dbType: string } => {
  const record = records.find((item) => String(item.id) === String(id));
  return {
    name: record?.name || id || '未选择',
    dbType: record?.dbType || 'UNKNOWN',
  };
};

interface EndpointHeaderProps {
  title: string;
  subtitle: string;
  dataSource: { name: string; dbType: string };
}

function EndpointHeader({ title, subtitle, dataSource }: EndpointHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-base font-semibold text-[#101828]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef2ff] text-[#315efb]">
            <DatabaseOutlined />
          </span>
          {title}
        </div>
        <div className="mt-2 text-xs leading-5 text-[#667085]">{subtitle}</div>
      </div>
      <div className="text-right">
        <div className="max-w-[180px] truncate text-sm font-medium text-[#344054]">
          {dataSource.name}
        </div>
        <Tag className="!mr-0 !mt-1 !border-[#d0d5dd] !bg-[#f9fafb] !text-[#475467]">
          {dataSource.dbType}
        </Tag>
      </div>
    </div>
  );
}

export default function SyncTaskConfigStep({
  editor,
  dataSources,
  onChange,
  onBackToConnection,
}: SyncTaskConfigStepProps) {
  const sourceNode = endpointNode(editor.workflow, 'source');
  const sinkNode = endpointNode(editor.workflow, 'sink');
  const sourceConfig = sourceNode?.data?.config || {};
  const sinkConfig = sinkNode?.data?.config || {};
  const isMulti = editor.mode === 'GUIDE_MULTI';

  const [sourceTables, setSourceTables] = useState<string[]>([]);
  const [targetTables, setTargetTables] = useState<string[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [targetLoading, setTargetLoading] = useState(false);

  const sourceId = editor.basic.sourceDataSourceId;
  const targetId = editor.basic.targetDataSourceId;
  const sourceDataSource = useMemo(
    () => dataSourceLabel(dataSources, sourceId),
    [dataSources, sourceId],
  );
  const targetDataSource = useMemo(
    () => dataSourceLabel(dataSources, targetId),
    [dataSources, targetId],
  );

  useEffect(() => {
    if (!sourceId) return;
    let active = true;
    setSourceLoading(true);
    dataSourceCatalogApi
      .listTable(sourceId)
      .then((response) => {
        if (!active) return;
        setSourceTables(normalizeTableNames(response?.data));
      })
      .catch(() => {
        if (active) setSourceTables([]);
      })
      .finally(() => {
        if (active) setSourceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sourceId]);

  useEffect(() => {
    if (!targetId) return;
    let active = true;
    setTargetLoading(true);
    dataSourceCatalogApi
      .listTable(targetId)
      .then((response) => {
        if (!active) return;
        setTargetTables(normalizeTableNames(response?.data));
      })
      .catch(() => {
        if (active) setTargetTables([]);
      })
      .finally(() => {
        if (active) setTargetLoading(false);
      });
    return () => {
      active = false;
    };
  }, [targetId]);

  const updateSource = (patch: Record<string, any>) =>
    onChange(updateEndpointConfig(editor, 'source', patch));

  const updateSink = (patch: Record<string, any>) =>
    onChange(updateEndpointConfig(editor, 'sink', patch));

  const updateChannel = (patch: Record<string, any>) =>
    onChange({
      ...editor,
      workflow: {
        ...editor.workflow,
        channelConfig: {
          ...(editor.workflow.channelConfig || {}),
          ...patch,
        },
      },
    });

  const channel = editor.workflow.channelConfig || {};

  return (
    <div>
      <Alert
        showIcon
        type="info"
        className="mb-5 !border-[#c7d7fe] !bg-[#f5f7ff]"
        message={isMulti ? '多表同步配置' : '单表同步配置'}
        description={
          <span>
            当前连接为 {sourceDataSource.name} → {targetDataSource.name}。
            <button
              type="button"
              className="ml-1 cursor-pointer border-0 bg-transparent p-0 text-[#315efb]"
              onClick={onBackToConnection}
            >
              重新选择并测试连接
            </button>
          </span>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] items-stretch gap-4">
        <Card className="!rounded-xl !border-[#e4e7ec]" styles={{ body: { padding: 24 } }}>
          <EndpointHeader
            title="Source 来源配置"
            subtitle={
              isMulti
                ? '选择需要批量同步的来源表，可搜索或手工录入表名'
                : '选择来源表，或使用查询语句读取需要同步的数据'
            }
            dataSource={sourceDataSource}
          />

          <Divider className="!my-5" />

          {!isMulti && (
            <Form.Item label="读取方式" className="!mb-5">
              <Segmented
                block
                value={sourceConfig.readMode || 'table'}
                options={[
                  { label: '选择数据表', value: 'table' },
                  { label: '自定义 SQL', value: 'sql' },
                ]}
                onChange={(value) => updateSource({ readMode: value })}
              />
            </Form.Item>
          )}

          {isMulti ? (
            <>
              <Form.Item label="来源表" required className="!mb-5">
                <Select
                  mode="tags"
                  showSearch
                  value={sourceConfig.tables || []}
                  options={sourceTables.map((table) => ({ label: table, value: table }))}
                  loading={sourceLoading}
                  placeholder="请选择一张或多张来源表"
                  optionFilterProp="label"
                  onChange={(tables) =>
                    updateSource({ tables, table: tables?.[0] || '' })
                  }
                />
              </Form.Item>
              <Form.Item label="表名过滤规则" className="!mb-0">
                <Input
                  value={sourceConfig.tablePattern || ''}
                  placeholder="可选，例如：ods_*"
                  onChange={(event) =>
                    updateSource({ tablePattern: event.target.value })
                  }
                />
              </Form.Item>
            </>
          ) : sourceConfig.readMode === 'sql' ? (
            <Form.Item label="查询 SQL" required className="!mb-0">
              <Input.TextArea
                rows={9}
                value={sourceConfig.sql || ''}
                placeholder="SELECT * FROM source_table"
                className="font-mono"
                onChange={(event) => updateSource({ sql: event.target.value })}
              />
            </Form.Item>
          ) : (
            <Form.Item label="来源表" required className="!mb-0">
              <Select
                showSearch
                value={sourceConfig.table || undefined}
                options={sourceTables.map((table) => ({ label: table, value: table }))}
                loading={sourceLoading}
                notFoundContent={sourceLoading ? <Spin size="small" /> : undefined}
                placeholder="请选择来源表"
                optionFilterProp="label"
                onChange={(table) => updateSource({ table })}
              />
            </Form.Item>
          )}
        </Card>

        <div className="flex items-center justify-center text-[24px] text-[#98a2b3]">
          <ArrowRightOutlined />
        </div>

        <Card className="!rounded-xl !border-[#e4e7ec]" styles={{ body: { padding: 24 } }}>
          <EndpointHeader
            title="Sink 目标配置"
            subtitle={
              isMulti
                ? '配置目标表命名规则和批量写入策略'
                : '选择目标表，并配置写入模式和主键策略'
            }
            dataSource={targetDataSource}
          />

          <Divider className="!my-5" />

          <Form.Item label="自动建表" className="!mb-5">
            <div className="flex items-center justify-between rounded-lg border border-[#e4e7ec] px-3 py-2.5">
              <span className="text-sm text-[#475467]">
                目标表不存在时由任务自动创建
              </span>
              <Switch
                checked={Boolean(sinkConfig.autoCreateTable)}
                onChange={(checked) => updateSink({ autoCreateTable: checked })}
              />
            </div>
          </Form.Item>

          {isMulti ? (
            <Form.Item label="目标表命名" required className="!mb-5">
              <Select
                value={sinkConfig.tableNamingRule || 'same_name'}
                options={[
                  { label: '保持来源表名', value: 'same_name' },
                  { label: '增加统一前缀', value: 'prefix' },
                  { label: '增加统一后缀', value: 'suffix' },
                ]}
                onChange={(tableNamingRule) => updateSink({ tableNamingRule })}
              />
              {sinkConfig.tableNamingRule !== 'same_name' && (
                <Input
                  className="mt-2"
                  value={sinkConfig.tableNameAffix || ''}
                  placeholder={
                    sinkConfig.tableNamingRule === 'prefix'
                      ? '例如：dw_'
                      : '例如：_bak'
                  }
                  onChange={(event) =>
                    updateSink({ tableNameAffix: event.target.value })
                  }
                />
              )}
            </Form.Item>
          ) : sinkConfig.autoCreateTable ? (
            <Form.Item label="目标表名" required className="!mb-5">
              <Input
                value={sinkConfig.targetTableName || ''}
                placeholder="请输入需要创建的目标表名"
                onChange={(event) =>
                  updateSink({ targetTableName: event.target.value })
                }
              />
            </Form.Item>
          ) : (
            <Form.Item label="目标表" required className="!mb-5">
              <Select
                showSearch
                value={sinkConfig.table || undefined}
                options={targetTables.map((table) => ({ label: table, value: table }))}
                loading={targetLoading}
                placeholder="请选择目标表"
                optionFilterProp="label"
                onChange={(table) => updateSink({ table })}
              />
            </Form.Item>
          )}

          <Form.Item label="写入模式" required className="!mb-5">
            <Select
              value={sinkConfig.writeMode || 'append'}
              options={[
                { label: '追加写入 Append', value: 'append' },
                { label: '覆盖写入 Overwrite', value: 'overwrite' },
                { label: '主键更新 Upsert', value: 'upsert' },
              ]}
              onChange={(writeMode) => updateSink({ writeMode })}
            />
          </Form.Item>

          {sinkConfig.writeMode === 'upsert' && (
            <Form.Item label="主键字段" required className="!mb-0">
              <Input
                value={sinkConfig.primaryKey || ''}
                placeholder="多个字段使用英文逗号分隔"
                onChange={(event) =>
                  updateSink({ primaryKey: event.target.value })
                }
              />
            </Form.Item>
          )}
        </Card>
      </div>

      <Card
        className="!mt-5 !rounded-xl !border-[#e4e7ec]"
        styles={{ body: { padding: 24 } }}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f2f4f7] text-[#475467]">
            <SettingOutlined />
          </span>
          <div>
            <div className="text-base font-semibold text-[#101828]">Channel 配置</div>
            <div className="mt-1 text-xs text-[#667085]">
              控制同步并发、批次大小和传输限速。配置会随任务定义一起保存。
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-4">
          <Form.Item label="并发数" className="!mb-0">
            <InputNumber
              min={1}
              max={128}
              className="!w-full"
              value={editor.env.parallelism}
              onChange={(parallelism) =>
                onChange({
                  ...editor,
                  env: {
                    ...editor.env,
                    parallelism: Number(parallelism || 1),
                  },
                })
              }
            />
          </Form.Item>

          <Form.Item label="写入批次" className="!mb-0">
            <InputNumber
              min={1}
              max={100000}
              className="!w-full"
              value={Number(sinkConfig.batchSize || 1000)}
              onChange={(batchSize) =>
                updateSink({ batchSize: Number(batchSize || 1000) })
              }
            />
          </Form.Item>

          <Form.Item label="传输限速" className="!mb-0">
            <Select
              value={channel.speedLimitEnabled ? 'limited' : 'unlimited'}
              options={[
                { label: '不限速', value: 'unlimited' },
                { label: '按记录数限速', value: 'limited' },
              ]}
              onChange={(value) =>
                updateChannel({ speedLimitEnabled: value === 'limited' })
              }
            />
          </Form.Item>

          <Form.Item label="每秒记录数" className="!mb-0">
            <InputNumber
              min={1}
              max={10000000}
              disabled={!channel.speedLimitEnabled}
              className="!w-full"
              value={Number(channel.recordsPerSecond || 10000)}
              onChange={(recordsPerSecond) =>
                updateChannel({
                  recordsPerSecond: Number(recordsPerSecond || 10000),
                })
              }
            />
          </Form.Item>
        </div>
      </Card>
    </div>
  );
}
