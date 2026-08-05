import {
  CheckCircle2,
  Eye,
  Play,
  RefreshCw,
  Save,
  Send,
  Share2,
  Square,
  WandSparkles,
} from 'lucide-react';
import type { ExecutionStatus, WorkbenchActionDefinition } from './types';

const isExecutionActive = (status: ExecutionStatus) =>
  status === 'RUNNING' || status === 'QUEUED';

export const BUILTIN_ACTIONS: WorkbenchActionDefinition[] = [
  {
    id: 'execution.run',
    label: '运行',
    icon: Play,
    command: 'execution.run',
    group: 'primary',
    order: 10,
    visible: ({ plugin, executionStatus }) =>
      plugin.type === 'SQL' && !isExecutionActive(executionStatus),
    enabled: ({ document }) => document.loadStatus === 'READY',
  },
  {
    id: 'http.test',
    label: '测试请求',
    icon: Play,
    command: 'http.test',
    group: 'primary',
    order: 10,
    visible: ({ plugin, executionStatus }) =>
      plugin.type === 'HTTP' && !isExecutionActive(executionStatus),
  },
  {
    id: 'execution.stop',
    label: '停止',
    icon: Square,
    command: 'execution.stop',
    group: 'primary',
    order: 20,
    visible: ({ plugin, executionStatus }) =>
      plugin.capabilities.stoppable && isExecutionActive(executionStatus),
    enabled: ({ executionStatus }) => isExecutionActive(executionStatus),
  },
  {
    id: 'document.save',
    label: '保存',
    icon: Save,
    command: 'document.save',
    group: 'edit',
    order: 10,
    visible: ({ plugin }) => plugin.capabilities.editable,
    enabled: ({ document }) => document.dirty,
    loading: ({ document }) => document.saveStatus === 'SAVING',
  },
  {
    id: 'document.format',
    label: '格式化',
    icon: WandSparkles,
    command: 'document.format',
    group: 'edit',
    order: 20,
    visible: ({ plugin }) => plugin.capabilities.formatable,
  },
  {
    id: 'document.refresh',
    label: '刷新',
    icon: RefreshCw,
    command: 'document.refresh',
    group: 'edit',
    order: 30,
  },
  {
    id: 'document.validate',
    label: '深度检查',
    icon: CheckCircle2,
    command: 'document.validate',
    group: 'resource',
    order: 20,
    visible: ({ plugin }) => plugin.capabilities.validatable,
  },
  {
    id: 'http.show-response',
    label: '查看响应',
    icon: Eye,
    command: 'http.show-response',
    group: 'resource',
    order: 30,
    visible: ({ plugin }) => plugin.type === 'HTTP',
  },
  {
    id: 'version.publish',
    label: '发布',
    icon: Send,
    command: 'version.publish',
    group: 'publish',
    order: 10,
    visible: ({ plugin }) => plugin.capabilities.publishable,
    enabled: ({ document, executionStatus }) =>
      !document.dirty && !isExecutionActive(executionStatus),
  },
  {
    id: 'resource.share',
    label: '分享',
    icon: Share2,
    command: 'resource.share',
    group: 'publish',
    order: 20,
    visible: ({ plugin }) => plugin.capabilities.shareable,
  },
];
