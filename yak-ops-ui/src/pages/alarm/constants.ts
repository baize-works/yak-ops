import type { Variants } from 'framer-motion';

export const ALARM_API_PREFIX = '/api/v1/alarm';

export const PAGE_DEFAULT_PAGINATION = {
  pageNo: 1,
  pageSize: 10,
  total: 0,
};

/** 严重级别配置：INFO / WARN / CRITICAL */
export const SEVERITY_CONFIG: Record<
  string,
  { text: string; color: string; backgroundColor: string; tagColor: string }
> = {
  INFO: {
    text: '信息',
    color: '#1677ff',
    backgroundColor: '#e6f4ff',
    tagColor: 'blue',
  },
  WARN: {
    text: '警告',
    color: '#fa8c16',
    backgroundColor: '#fff7e6',
    tagColor: 'orange',
  },
  CRITICAL: {
    text: '严重',
    color: '#ff4d4f',
    backgroundColor: '#fff2f0',
    tagColor: 'red',
  },
};

/** 默认严重级别 */
export const DEFAULT_SEVERITY = 'WARN';

/** 严重级别选项 */
export const SEVERITY_OPTIONS = [
  { label: '信息', value: 'INFO' },
  { label: '警告', value: 'WARN' },
  { label: '严重', value: 'CRITICAL' },
];

/**
 * JobStatus 选项，对应后端 io.yak.ops.common.enums.JobStatus。
 * 用于规则的 triggerStatuses 多选。
 */
export const JOB_STATUS_OPTIONS = [
  { label: 'INITIALIZING', value: 'INITIALIZING' },
  { label: 'CREATED', value: 'CREATED' },
  { label: 'PENDING', value: 'PENDING' },
  { label: 'SCHEDULED', value: 'SCHEDULED' },
  { label: 'RUNNING', value: 'RUNNING' },
  { label: 'FAILING', value: 'FAILING' },
  { label: 'FAILED', value: 'FAILED' },
  { label: 'DOING_SAVEPOINT', value: 'DOING_SAVEPOINT' },
  { label: 'SAVEPOINT_DONE', value: 'SAVEPOINT_DONE' },
  { label: 'CANCELING', value: 'CANCELING' },
  { label: 'CANCELED', value: 'CANCELED' },
  { label: 'FINISHED', value: 'FINISHED' },
  { label: 'UNKNOWABLE', value: 'UNKNOWABLE' },
];

/** 任务状态展示配色（用于记录 newStatus 列的 Tag） */
export const JOB_STATUS_TAG_COLOR: Record<string, string> = {
  RUNNING: 'processing',
  SCHEDULED: 'processing',
  CREATED: 'default',
  PENDING: 'warning',
  INITIALIZING: 'default',
  FAILED: 'error',
  FAILING: 'error',
  CANCELED: 'default',
  CANCELING: 'warning',
  FINISHED: 'success',
  SAVEPOINT_DONE: 'success',
  DOING_SAVEPOINT: 'warning',
  UNKNOWABLE: 'default',
};

/** 通道类型展示图标颜色（统一主色） */
export const CHANNEL_TYPE_COLOR = 'hsl(231 48% 48%)';

export const PAGE_ANIMATION: Record<string, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  },
  sectionStagger: {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.06,
      },
    },
  },
  cardStagger: {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.06,
      },
    },
  },
};
