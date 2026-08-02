import {
  ApartmentOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Input,
  Segmented,
  Select,
  Space,
  Tag,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

import {
  linkupClientApi,
  type LinkupClientOption,
} from '@/pages/client/api';
import { API_SUCCESS_CODE } from '@/services/http/response';

import type {
  SyncEditorState,
  WorkerLabelRequirement,
  WorkerSelectMode,
} from '../model';
import EditorSection, { EditorField } from './EditorSection';

interface WorkerSchedulingSectionProps {
  editor: SyncEditorState;
  onChange: (value: SyncEditorState) => void;
}

const statusText = (worker: LinkupClientOption) => {
  if (worker.schedulingStatus === 'DRAINING') return '排空中';
  if (worker.schedulingStatus === 'DISABLED') return '已禁用';
  if (worker.status !== 'UP') return '离线';
  return worker.available ? '可调度' : '容量已满';
};

export default function WorkerSchedulingSection({
  editor,
  onChange,
}: WorkerSchedulingSectionProps) {
  const [workers, setWorkers] = useState<LinkupClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadWorkers = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const response = await linkupClientApi.option();
      if (response?.code !== API_SUCCESS_CODE) {
        setWorkers([]);
        setLoadError(response?.message || response?.msg || '获取 Worker 列表失败');
        return;
      }
      setWorkers(response?.data || []);
    } catch (error: any) {
      setWorkers([]);
      setLoadError(error?.message || '获取 Worker 列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkers();
  }, []);

  const selectOptions = useMemo(
    () => workers.map((worker) => ({
      value: worker.value,
      title: worker.label,
      label: (
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="truncate">{worker.label}</span>
          <span className="shrink-0 text-[11px] text-[#98a2b3]">
            {worker.runningJobs || 0}/{worker.maxConcurrentJobs || 0} 运行 ·{' '}
            {worker.queuedJobs || 0}/{worker.maxQueuedJobs || 0} 排队 ·{' '}
            {statusText(worker)}
          </span>
        </div>
      ),
    })),
    [workers],
  );

  const selectedWorker = workers.find(
    (worker) => worker.value === editor.worker.nodeId,
  );

  const updateWorker = (
    patch: Partial<SyncEditorState['worker']>,
  ) => {
    onChange({
      ...editor,
      worker: {
        ...editor.worker,
        ...patch,
      },
    });
  };

  const updateMode = (mode: WorkerSelectMode) => {
    updateWorker({
      mode,
      nodeId: mode === 'MANUAL' ? editor.worker.nodeId : undefined,
    });
  };

  const updateLabel = (
    index: number,
    patch: Partial<WorkerLabelRequirement>,
  ) => {
    updateWorker({
      requiredLabels: editor.worker.requiredLabels.map((label, current) =>
        current === index ? { ...label, ...patch } : label,
      ),
    });
  };

  const removeLabel = (index: number) => {
    updateWorker({
      requiredLabels: editor.worker.requiredLabels.filter(
        (_, current) => current !== index,
      ),
    });
  };

  const addLabel = () => {
    updateWorker({
      requiredLabels: [
        ...editor.worker.requiredLabels,
        { key: '', value: '' },
      ],
    });
  };

  return (
    <EditorSection title="执行节点调度">
      <div className="space-y-5">
        <EditorField label="选择方式" required>
          <Segmented
            block
            value={editor.worker.mode}
            options={[
              {
                value: 'AUTO',
                label: '自动分配',
              },
              {
                value: 'MANUAL',
                label: '指定节点',
              },
            ]}
            onChange={(value) => updateMode(value as WorkerSelectMode)}
          />
        </EditorField>

        {editor.worker.mode === 'MANUAL' ? (
          <EditorField label="执行 Worker" required>
            <Select
              showSearch
              allowClear
              variant="filled"
              value={editor.worker.nodeId}
              loading={loading}
              options={selectOptions}
              optionFilterProp="title"
              placeholder="请选择 Link-Up Worker"
              className="w-full"
              onDropdownVisibleChange={(open) => {
                if (open && workers.length === 0) void loadWorkers();
              }}
              onChange={(nodeId) => updateWorker({ nodeId })}
            />

            {selectedWorker ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[#667085]">
                <Tag className="!m-0">{selectedWorker.status || 'UNKNOWN'}</Tag>
                <Tag className="!m-0">
                  {selectedWorker.schedulingStatus || 'UNKNOWN'}
                </Tag>
                <span>
                  运行 {selectedWorker.runningJobs || 0}/
                  {selectedWorker.maxConcurrentJobs || 0}
                </span>
                <span>
                  排队 {selectedWorker.queuedJobs || 0}/
                  {selectedWorker.maxQueuedJobs || 0}
                </span>
              </div>
            ) : null}
          </EditorField>
        ) : (
          <Alert
            type="info"
            showIcon
            icon={<ApartmentOutlined />}
            message="自动调度会先做硬过滤，再按负载与权重评分"
            description="只选择在线、心跳有效、允许调度、标签匹配且容量未满的 Worker；即时并发余量占 55%，总容量余量占 35%，管理权重占 10%。"
          />
        )}

        <EditorField label="Worker 标签约束">
          <div className="space-y-2">
            {editor.worker.requiredLabels.map((label, index) => (
              <Space.Compact key={index} block>
                <Input
                  variant="filled"
                  value={label.key}
                  placeholder="标签名，例如 region"
                  onChange={(event) =>
                    updateLabel(index, { key: event.target.value })
                  }
                />
                <Input
                  variant="filled"
                  value={label.value}
                  placeholder="标签值，例如 south-china"
                  onChange={(event) =>
                    updateLabel(index, { value: event.target.value })
                  }
                />
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeLabel(index)}
                />
              </Space.Compact>
            ))}

            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={addLabel}
            >
              添加标签约束
            </Button>
          </div>
          <div className="mt-2 text-[12px] leading-5 text-[#98a2b3]">
            标签采用精确匹配。自动模式用于筛选候选节点；指定节点模式也会校验所选 Worker 是否满足标签。
          </div>
        </EditorField>

        {loadError ? (
          <Alert
            type="warning"
            showIcon
            message={loadError}
            action={
              <Button size="small" onClick={() => void loadWorkers()}>
                重试
              </Button>
            }
          />
        ) : null}
      </div>
    </EditorSection>
  );
}
