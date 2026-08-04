import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { sql } from '@codemirror/lang-sql';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import {
  BRAND_COLOR,
  BRAND_CSS_VARIABLES,
  BRAND_THEME,
} from '@/styles/brand';
import {
  Button,
  ConfigProvider,
  Dropdown,
  Form,
  Input,
  message,
  Modal,
  Select,
  Switch,
  Tooltip,
  type MenuProps,
} from 'antd';
import dayjs from 'dayjs';
import {
  BookOpen,
  Braces,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  Cloud,
  Code2,
  Copy,
  Database,
  FileCode2,
  FileCog,
  FileJson2,
  Folder,
  FolderOpen,
  GitBranch,
  History as HistoryIcon,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  Share2,
  SlidersHorizontal,
  Square,
  Terminal,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';

type WorkspaceFileKind =
  | 'sql'
  | 'flink'
  | 'python'
  | 'shell'
  | 'notebook'
  | 'integration'
  | 'resource';

type ExplorerFilter = 'all' | 'owned' | 'favorite';
type RightPanelKey = 'properties' | 'run' | 'schedule' | 'version';

interface WorkspaceFile {
  id: string;
  name: string;
  kind: WorkspaceFileKind;
  folder: string;
  engine: string;
  content: string;
  description?: string;
  owner: 'me' | 'other';
  favorite?: boolean;
  dirty?: boolean;
  updatedAt: string;
}

interface CreateFileValues {
  name: string;
  kind: WorkspaceFileKind;
  folder: string;
}

interface FileKindMeta {
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  iconClassName: string;
  extension: string;
  engine: string;
  defaultFolder: string;
}

const joinLines = (...lines: string[]) => lines.join('\n');

const FILE_KIND_META: Record<WorkspaceFileKind, FileKindMeta> = {
  sql: {
    label: 'SQL 脚本',
    icon: Braces,
    iconClassName: 'text-[#22a447]',
    extension: '.sql',
    engine: 'MySQL',
    defaultFolder: 'sql',
  },
  flink: {
    label: 'Flink SQL',
    icon: FileCode2,
    iconClassName: 'text-[#ff8a00]',
    extension: '.sql',
    engine: 'Flink SQL',
    defaultFolder: 'flink',
  },
  python: {
    label: 'Python 任务',
    icon: Code2,
    iconClassName: 'text-[#3478c9]',
    extension: '.py',
    engine: 'Python',
    defaultFolder: 'python',
  },
  shell: {
    label: 'Shell 脚本',
    icon: Terminal,
    iconClassName: 'text-[#3b82f6]',
    extension: '.sh',
    engine: 'Shell',
    defaultFolder: 'shell',
  },
  notebook: {
    label: 'Notebook',
    icon: BookOpen,
    iconClassName: 'text-[#8b5cf6]',
    extension: '.ipynb',
    engine: 'Notebook',
    defaultFolder: 'notebook',
  },
  integration: {
    label: '数据集成任务',
    icon: Database,
    iconClassName: 'text-[#13a8a8]',
    extension: '',
    engine: 'Link-Up',
    defaultFolder: 'integration',
  },
  resource: {
    label: '资源文件',
    icon: FileCog,
    iconClassName: 'text-[#687076]',
    extension: '',
    engine: 'Resource',
    defaultFolder: 'resource',
  },
};

const FOLDER_GROUPS = [
  { id: 'sql', label: 'SQL', kind: 'sql' as const },
  { id: 'flink', label: 'Flink', kind: 'flink' as const },
  { id: 'python', label: 'Python', kind: 'python' as const },
  { id: 'shell', label: 'Shell', kind: 'shell' as const },
  { id: 'notebook', label: 'Notebook', kind: 'notebook' as const },
  { id: 'integration', label: '数据集成任务', kind: 'integration' as const },
  { id: 'resource', label: '资源文件', kind: 'resource' as const },
];

const DEFAULT_SQL = joinLines(
  '-- ================================================================',
  '-- Yak-ops 数据开发 - Flink SQL 脚本',
  '-- 任务名称: mysql_sql_etl',
  '-- 创建人: admin',
  '-- 创建时间: 2026-08-04 09:20:11',
  '-- 描述: 从 MySQL 读取用户行为数据，清洗后写入 ODPS',
  '-- ================================================================',
  '',
  "SET 'execution.checkpointing.interval' = '60s';",
  "SET 'parallelism.default' = '4';",
  '',
  'CREATE TABLE src_user_behavior (',
  '  user_id BIGINT,',
  '  event_type STRING,',
  '  event_time TIMESTAMP(3),',
  '  event_value STRING,',
  '  dt STRING',
  ') WITH (',
  "  'connector' = 'mysql-cdc',",
  "  'hostname' = 'rm-bp1abcd123.mysql.rds.aliyuncs.com',",
  "  'port' = '3306',",
  "  'username' = 'yakops',",
  "  'password' = '******',",
  "  'database-name' = 'user_db',",
  "  'table-name' = 'user_behavior',",
  "  'server-time-zone' = 'Asia/Shanghai'",
  ');',
  '',
  '-- 清洗与转换',
  'CREATE TABLE dwd_user_behavior (',
  '  user_id BIGINT,',
  '  event_type STRING,',
  '  event_time TIMESTAMP(3),',
  '  event_value STRING,',
  '  dt STRING',
  ') WITH (',
  "  'connector' = 'odps',",
  "  'project' = 'yakops_dev',",
  "  'table' = 'dwd_user_behavior'",
  ');',
  '',
  'INSERT INTO dwd_user_behavior',
  'SELECT',
  '  user_id,',
  '  UPPER(event_type) AS event_type,',
  '  event_time,',
  '  event_value,',
  "  DATE_FORMAT(event_time, 'yyyyMMdd') AS dt",
  'FROM src_user_behavior;',
);

const INITIAL_FILES: WorkspaceFile[] = [
  {
    id: 'mysql-sql-etl',
    name: 'mysql_sql_etl.sql',
    kind: 'sql',
    folder: 'sql',
    engine: 'Flink SQL',
    content: DEFAULT_SQL,
    description: '从 MySQL 读取用户行为数据，清洗后写入 ODPS。',
    owner: 'me',
    favorite: true,
    updatedAt: '2026-08-04 09:20',
  },
  {
    id: 'user-behavior-agg',
    name: 'user_behavior_agg.sql',
    kind: 'sql',
    folder: 'sql',
    engine: 'Spark SQL',
    content: joinLines(
      '-- 用户行为指标按天聚合',
      'INSERT OVERWRITE TABLE ads_user_behavior_daily',
      'SELECT',
      '  user_id,',
      '  COUNT(*) AS event_count,',
      '  COUNT(DISTINCT event_type) AS event_type_count,',
      '  dt',
      'FROM dwd_user_behavior',
      'WHERE dt = ${bizdate}',
      'GROUP BY user_id, dt;',
    ),
    owner: 'me',
    updatedAt: '2026-08-04 08:46',
  },
  {
    id: 'dim-user-profile',
    name: 'dim_user_profile.sql',
    kind: 'sql',
    folder: 'sql',
    engine: 'Hive',
    content: joinLines(
      '-- 用户画像维度表',
      'CREATE TABLE IF NOT EXISTS dim_user_profile (',
      '  user_id BIGINT,',
      '  user_name STRING,',
      '  user_level STRING,',
      '  register_time TIMESTAMP',
      ');',
    ),
    owner: 'other',
    favorite: true,
    updatedAt: '2026-08-03 18:20',
  },
  {
    id: 'ods-to-dwd-flink',
    name: 'ods_to_dwd_flink.sql',
    kind: 'flink',
    folder: 'flink',
    engine: 'Flink SQL',
    content: joinLines(
      '-- ODS 实时清洗到 DWD',
      "SET 'execution.checkpointing.interval' = '30s';",
      '',
      'INSERT INTO dwd_order_detail',
      'SELECT *',
      'FROM ods_order_stream',
      'WHERE order_status IS NOT NULL;',
    ),
    owner: 'me',
    updatedAt: '2026-08-04 08:02',
  },
  {
    id: 'user-log-stream',
    name: 'user_log_stream.sql',
    kind: 'flink',
    folder: 'flink',
    engine: 'Flink SQL',
    content: joinLines(
      '-- Kafka 用户日志实时处理',
      'CREATE TABLE user_log_stream (',
      '  user_id BIGINT,',
      '  action STRING,',
      '  event_time TIMESTAMP(3),',
      '  WATERMARK FOR event_time AS event_time - INTERVAL \'5\' SECOND',
      ') WITH (',
      "  'connector' = 'kafka'",
      ');',
    ),
    owner: 'me',
    updatedAt: '2026-08-03 20:18',
  },
  {
    id: 'udf-string-masking',
    name: 'udf_string_masking.py',
    kind: 'python',
    folder: 'python',
    engine: 'Python',
    content: joinLines(
      'from typing import Optional',
      '',
      '',
      'def mask_phone(value: Optional[str]) -> str:',
      '    """Mask a mobile number while retaining the first and last segments."""',
      '    if not value or len(value) < 7:',
      '        return value or ""',
      '    return f"{value[:3]}****{value[-4:]}"',
    ),
    owner: 'me',
    favorite: true,
    updatedAt: '2026-08-03 16:21',
  },
  {
    id: 'etl-user-profile',
    name: 'etl_user_profile.py',
    kind: 'python',
    folder: 'python',
    engine: 'Python',
    content: joinLines(
      'from datetime import date',
      '',
      '',
      'def build_profile_partition() -> str:',
      '    return date.today().strftime("%Y%m%d")',
      '',
      '',
      'if __name__ == "__main__":',
      '    print(build_profile_partition())',
    ),
    owner: 'other',
    updatedAt: '2026-08-02 14:36',
  },
  {
    id: 'shell-clean-log',
    name: 'shell_clean_log.sh',
    kind: 'shell',
    folder: 'shell',
    engine: 'Shell',
    content: joinLines(
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      '',
      'LOG_DIR="/data/yak-ops/logs"',
      'RETENTION_DAYS=14',
      '',
      'find "$LOG_DIR" -type f -name "*.log" -mtime +$RETENTION_DAYS -delete',
      'echo "expired logs cleaned"',
    ),
    owner: 'me',
    updatedAt: '2026-08-03 17:20',
  },
  {
    id: 'shell-data-export',
    name: 'shell_data_export.sh',
    kind: 'shell',
    folder: 'shell',
    engine: 'Shell',
    content: joinLines(
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      '',
      'EXPORT_DATE=${1:-$(date +%Y%m%d)}',
      'echo "export partition: $EXPORT_DATE"',
    ),
    owner: 'me',
    updatedAt: '2026-08-01 19:28',
  },
  {
    id: 'notebook-user-profile',
    name: 'notebook_user_profile.ipynb',
    kind: 'notebook',
    folder: 'notebook',
    engine: 'PySpark',
    content: joinLines(
      '# 用户画像探索分析',
      'from pyspark.sql import functions as F',
      '',
      'profiles = spark.table("dim_user_profile")',
      'profiles.groupBy("user_level").count().orderBy(F.desc("count")).show()',
    ),
    owner: 'me',
    favorite: true,
    updatedAt: '2026-08-03 18:45',
  },
  {
    id: 'sync-mysql-odps',
    name: 'sync_mysql_to_odps_20260801',
    kind: 'integration',
    folder: 'integration',
    engine: 'Link-Up',
    content: joinLines(
      '{',
      '  "source": "mysql_user_db",',
      '  "target": "odps_yakops_dev",',
      '  "mode": "FULL_AND_INCREMENTAL",',
      '  "parallelism": 4',
      '}',
    ),
    owner: 'me',
    updatedAt: '2026-08-04 08:50',
  },
  {
    id: 'sync-odps-odps',
    name: 'sync_odps_to_odps_20260803',
    kind: 'integration',
    folder: 'integration',
    engine: 'Link-Up',
    content: joinLines(
      '{',
      '  "source": "odps_raw",',
      '  "target": "odps_dwd",',
      '  "table": "user_behavior",',
      '  "writeMode": "OVERWRITE"',
      '}',
    ),
    owner: 'me',
    favorite: true,
    updatedAt: '2026-08-04 08:54',
  },
  {
    id: 'dev-env',
    name: 'dev.env',
    kind: 'resource',
    folder: 'resource',
    engine: 'Resource',
    content: joinLines(
      'YAK_ENV=development',
      'YAK_PARALLELISM=4',
      'YAK_CHECKPOINT_INTERVAL=60s',
    ),
    owner: 'me',
    updatedAt: '2026-08-02 12:00',
  },
];

const CREATE_MENU_ITEMS: MenuProps['items'] = [
  { key: 'sql', label: 'SQL 脚本', icon: <Braces size={15} /> },
  { key: 'flink', label: 'Flink SQL', icon: <FileCode2 size={15} /> },
  { key: 'python', label: 'Python 任务', icon: <Code2 size={15} /> },
  { key: 'shell', label: 'Shell 脚本', icon: <Terminal size={15} /> },
  { key: 'notebook', label: 'Notebook', icon: <BookOpen size={15} /> },
  { type: 'divider' },
  { key: 'integration', label: '数据集成任务', icon: <Database size={15} /> },
  { key: 'resource', label: '资源文件', icon: <FileCog size={15} /> },
];

const ENGINE_OPTIONS = [
  { label: 'Flink SQL', value: 'Flink SQL' },
  { label: 'Spark SQL', value: 'Spark SQL' },
  { label: 'MySQL', value: 'MySQL' },
  { label: 'Hive', value: 'Hive' },
  { label: 'Python', value: 'Python' },
  { label: 'Shell', value: 'Shell' },
  { label: 'Link-Up', value: 'Link-Up' },
];

const CodeEditor = ({
  value,
  kind,
  onChange,
}: {
  value: string;
  kind: WorkspaceFileKind;
  onChange: (value: string) => void;
}) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return undefined;

    const languageExtensions: Extension[] =
      kind === 'sql' || kind === 'flink' ? [sql()] : [];

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        EditorState.tabSize.of(2),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        ...languageExtensions,
        highlightActiveLine(),
        EditorView.contentAttributes.of({ 'aria-label': '代码编辑器' }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            backgroundColor: '#ffffff',
            color: '#25272d',
            fontSize: '13px',
          },
          '&.cm-focused': { outline: 'none' },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily:
              'JetBrains Mono, SFMono-Regular, Consolas, Liberation Mono, monospace',
            lineHeight: '1.72',
          },
          '.cm-content': { padding: '10px 0 48px' },
          '.cm-line': { padding: '0 20px' },
          '.cm-gutters': {
            backgroundColor: '#fbfbfc',
            color: '#a1a5ad',
            border: 'none',
            borderRight: '1px solid #f0f1f3',
          },
          '.cm-activeLine': { backgroundColor: 'rgba(22,24,35,0.028)' },
          '.cm-activeLineGutter': {
            backgroundColor: 'rgba(22,24,35,0.04)',
            color: '#4a4d55',
          },
          '.cm-cursor': { borderLeftColor: 'var(--yak-brand-color)' },
          '.cm-selectionBackground, ::selection': {
            backgroundColor: 'var(--yak-brand-color-soft-hover) !important',
          },
          '.cm-foldPlaceholder': {
            backgroundColor: '#f2f3f5',
            border: 'none',
            color: '#62656d',
          },
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    return () => view.destroy();
  }, [kind, onChange, value]);

  return <div ref={hostRef} className="h-full min-h-0" />;
};

const ToolButton = ({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <Tooltip title={label} mouseEnterDelay={0.45}>
    <Button
      type="text"
      size="small"
      disabled={disabled}
      onClick={onClick}
      icon={icon}
      className="!flex !h-8 !items-center !gap-1.5 !px-2 !text-[13px] !text-[rgba(22,24,35,0.72)]"
    >
      <span className="max-[1180px]:hidden">{label}</span>
    </Button>
  </Tooltip>
);

const DataDevelopmentWorkbenchPage = () => {
  const [form] = Form.useForm<CreateFileValues>();
  const [files, setFiles] = useState<WorkspaceFile[]>(INITIAL_FILES);
  const [openTabs, setOpenTabs] = useState<string[]>([
    'mysql-sql-etl',
    'sync-odps-odps',
    'notebook-user-profile',
    'udf-string-masking',
    'shell-clean-log',
  ]);
  const [activeFileId, setActiveFileId] = useState('mysql-sql-etl');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    sql: true,
    flink: true,
    python: true,
    shell: true,
    notebook: true,
    integration: true,
    resource: true,
  });
  const [explorerFilter, setExplorerFilter] = useState<ExplorerFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanelKey | null>(null);
  const [explorerVisible, setExplorerVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [running, setRunning] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  const activeFile = files.find((file) => file.id === activeFileId);
  const tabFiles = openTabs
    .map((id) => files.find((file) => file.id === id))
    .filter((file): file is WorkspaceFile => Boolean(file));

  const visibleFiles = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return files.filter((file) => {
      const matchesKeyword =
        !normalizedKeyword || file.name.toLowerCase().includes(normalizedKeyword);
      const matchesFilter =
        explorerFilter === 'all' ||
        (explorerFilter === 'owned' && file.owner === 'me') ||
        (explorerFilter === 'favorite' && file.favorite);
      return matchesKeyword && matchesFilter;
    });
  }, [explorerFilter, files, keyword]);

  const openFile = (id: string) => {
    setOpenTabs((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setActiveFileId(id);
  };

  const closeTab = (id: string) => {
    setOpenTabs((current) => {
      const index = current.indexOf(id);
      const next = current.filter((tabId) => tabId !== id);
      if (activeFileId === id) {
        setActiveFileId(next[Math.max(0, index - 1)] ?? next[0] ?? '');
      }
      return next;
    });
  };

  const updateFile = (id: string, patch: Partial<WorkspaceFile>) => {
    setFiles((current) =>
      current.map((file) => (file.id === id ? { ...file, ...patch } : file)),
    );
  };

  const updateActiveContent = (content: string) => {
    if (!activeFile) return;
    setFiles((current) =>
      current.map((file) =>
        file.id === activeFile.id && file.content !== content
          ? { ...file, content, dirty: true }
          : file,
      ),
    );
  };

  const openCreateModal = (kind: WorkspaceFileKind = 'sql') => {
    const meta = FILE_KIND_META[kind];
    form.setFieldsValue({ kind, folder: meta.defaultFolder, name: '' });
    setCreateOpen(true);
  };

  const handleCreate = (values: CreateFileValues) => {
    const meta = FILE_KIND_META[values.kind];
    const rawName = values.name.trim();
    const name =
      meta.extension && !rawName.endsWith(meta.extension)
        ? `${rawName}${meta.extension}`
        : rawName;
    const id = `${values.kind}-${Date.now()}`;
    const nextFile: WorkspaceFile = {
      id,
      name,
      kind: values.kind,
      folder: values.folder,
      engine: meta.engine,
      content: joinLines(
        `-- ${meta.label}`,
        `-- 创建时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
        '',
      ),
      owner: 'me',
      dirty: true,
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    };

    setFiles((current) => [...current, nextFile]);
    setExpandedFolders((current) => ({ ...current, [values.folder]: true }));
    setOpenTabs((current) => [...current, id]);
    setActiveFileId(id);
    setCreateOpen(false);
    form.resetFields();
    message.success('开发节点已创建');
  };

  const saveActive = () => {
    if (!activeFile) return;
    updateFile(activeFile.id, {
      dirty: false,
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    });
    message.success(`${activeFile.name} 已保存`);
  };

  const formatActive = () => {
    if (!activeFile) return;
    const formatted = activeFile.content
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');
    updateFile(activeFile.id, { content: formatted, dirty: true });
    message.success('格式化完成');
  };

  const runActive = () => {
    if (!activeFile || running) return;
    setRunning(true);
    message.loading({ content: `正在运行 ${activeFile.name}`, key: 'run-task' });
    window.setTimeout(() => {
      setRunning(false);
      message.success({ content: '运行请求已提交', key: 'run-task' });
    }, 1100);
  };

  const deleteActiveFile = () => {
    if (!activeFile) return;
    Modal.confirm({
      centered: true,
      title: '删除开发节点',
      content: `确认删除“${activeFile.name}”吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        setFiles((current) => current.filter((file) => file.id !== activeFile.id));
        closeTab(activeFile.id);
        message.success('节点已删除');
      },
    });
  };

  const renderFileRow = (file: WorkspaceFile) => {
    const meta = FILE_KIND_META[file.kind];
    const Icon = meta.icon;
    const selected = activeFileId === file.id;

    return (
      <button
        key={file.id}
        type="button"
        onClick={() => openFile(file.id)}
        className={[
          'group flex h-7 w-full items-center gap-2 rounded-[5px] border-0 px-2.5 text-left text-[12px] transition-colors',
          selected
            ? 'bg-[var(--yak-brand-color-soft)] text-[var(--yak-brand-color)]'
            : 'bg-transparent text-[rgba(22,24,35,0.72)] hover:bg-[#f5f6f7]',
        ].join(' ')}
      >
        <Icon size={14} className={selected ? '' : meta.iconClassName} />
        <span className="min-w-0 flex-1 truncate">{file.name}</span>
        {file.favorite && (
          <Circle
            size={6}
            fill="currentColor"
            className="shrink-0 text-[rgba(22,24,35,0.24)]"
          />
        )}
        {file.dirty && (
          <Circle
            size={6}
            fill="currentColor"
            className="shrink-0 text-[var(--yak-brand-color)]"
          />
        )}
      </button>
    );
  };

  const renderRightPanelContent = () => {
    if (!rightPanel) return null;

    const titleMap: Record<RightPanelKey, string> = {
      properties: '属性',
      run: '运行配置',
      schedule: '调度配置',
      version: '版本记录',
    };

    return (
      <aside className="flex w-[300px] shrink-0 flex-col border-l border-[#e7e9ec] bg-white">
        <div className="flex h-11 items-center justify-between border-b border-[#eceef0] px-4">
          <strong className="text-[13px] font-semibold text-[#161823]">
            {titleMap[rightPanel]}
          </strong>
          <Button
            type="text"
            size="small"
            aria-label="关闭右侧面板"
            icon={<X size={15} />}
            onClick={() => setRightPanel(null)}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {rightPanel === 'properties' && (
            <div className="space-y-4">
              <PanelField label="节点名称">
                <Input
                  variant="filled"
                  value={activeFile?.name}
                  disabled={!activeFile}
                  onChange={(event) =>
                    activeFile && updateFile(activeFile.id, { name: event.target.value, dirty: true })
                  }
                />
              </PanelField>
              <PanelField label="节点类型">
                <Input
                  variant="filled"
                  disabled
                  value={activeFile ? FILE_KIND_META[activeFile.kind].label : ''}
                />
              </PanelField>
              <PanelField label="计算引擎">
                <Select
                  variant="filled"
                  className="w-full"
                  options={ENGINE_OPTIONS}
                  value={activeFile?.engine}
                  disabled={!activeFile}
                  onChange={(engine) =>
                    activeFile && updateFile(activeFile.id, { engine, dirty: true })
                  }
                />
              </PanelField>
              <PanelField label="描述">
                <Input.TextArea
                  variant="filled"
                  rows={5}
                  value={activeFile?.description}
                  placeholder="填写节点说明"
                  disabled={!activeFile}
                  onChange={(event) =>
                    activeFile &&
                    updateFile(activeFile.id, {
                      description: event.target.value,
                      dirty: true,
                    })
                  }
                />
              </PanelField>
              <div className="border-t border-[#eceef0] pt-4">
                <Button
                  danger
                  block
                  icon={<Trash2 size={15} />}
                  disabled={!activeFile}
                  onClick={deleteActiveFile}
                >
                  删除节点
                </Button>
              </div>
            </div>
          )}

          {rightPanel === 'run' && (
            <div className="space-y-4">
              <PanelField label="运行环境">
                <Select
                  variant="filled"
                  className="w-full"
                  defaultValue="development"
                  options={[
                    { label: '开发环境', value: 'development' },
                    { label: '测试环境', value: 'testing' },
                    { label: '生产环境', value: 'production' },
                  ]}
                />
              </PanelField>
              <PanelField label="并行度">
                <Input variant="filled" defaultValue="4" />
              </PanelField>
              <PanelField label="Checkpoint 间隔">
                <Input variant="filled" defaultValue="60s" />
              </PanelField>
              <PanelField label="运行队列">
                <Select
                  variant="filled"
                  className="w-full"
                  defaultValue="default"
                  options={[
                    { label: 'default', value: 'default' },
                    { label: 'etl-high', value: 'etl-high' },
                    { label: 'batch-low', value: 'batch-low' },
                  ]}
                />
              </PanelField>
              <div className="rounded-lg bg-[#f7f8f9] p-3 text-[12px] leading-5 text-[rgba(22,24,35,0.56)]">
                运行参数仅用于当前开发环境，发布后由生产配置覆盖。
              </div>
            </div>
          )}

          {rightPanel === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-[#e7e9ec] p-3">
                <div>
                  <div className="text-[13px] font-medium text-[#161823]">开启调度</div>
                  <div className="mt-1 text-[11px] text-[rgba(22,24,35,0.44)]">
                    按周期自动生成运行实例
                  </div>
                </div>
                <Switch checked={scheduleEnabled} onChange={setScheduleEnabled} />
              </div>
              <PanelField label="调度周期">
                <Select
                  variant="filled"
                  className="w-full"
                  disabled={!scheduleEnabled}
                  defaultValue="daily"
                  options={[
                    { label: '每天', value: 'daily' },
                    { label: '每小时', value: 'hourly' },
                    { label: '每周', value: 'weekly' },
                  ]}
                />
              </PanelField>
              <PanelField label="Cron 表达式">
                <Input
                  variant="filled"
                  disabled={!scheduleEnabled}
                  defaultValue="0 0 2 * * ?"
                />
              </PanelField>
              <PanelField label="失败重试次数">
                <Input variant="filled" disabled={!scheduleEnabled} defaultValue="2" />
              </PanelField>
            </div>
          )}

          {rightPanel === 'version' && (
            <div className="space-y-1">
              {[
                ['v0.8', '当前草稿', '刚刚', true],
                ['v0.7', '调整字段映射与并行度', '08-04 08:36', false],
                ['v0.6', '增加用户行为清洗逻辑', '08-03 19:20', false],
                ['v0.5', '发布到开发环境', '08-03 16:42', false],
              ].map(([version, description, time, current]) => (
                <div
                  key={String(version)}
                  className="relative flex gap-3 border-l border-[#e4e7ec] pb-5 pl-4 last:pb-0"
                >
                  <span
                    className={[
                      'absolute -left-[4px] top-1 h-[7px] w-[7px] rounded-full',
                      current
                        ? 'bg-[var(--yak-brand-color)]'
                        : 'bg-[#c7cad0]',
                    ].join(' ')}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <strong className="text-[12px] text-[#161823]">{version}</strong>
                      {current && (
                        <span className="rounded bg-[var(--yak-brand-color-soft)] px-1.5 py-0.5 text-[10px] text-[var(--yak-brand-color)]">
                          当前
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[12px] leading-5 text-[rgba(22,24,35,0.62)]">
                      {description}
                    </div>
                    <div className="mt-1 text-[11px] text-[rgba(22,24,35,0.36)]">
                      admin · {time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    );
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div
        style={BRAND_CSS_VARIABLES}
        className="flex h-[calc(100vh-48px)] min-h-[620px] flex-col overflow-hidden bg-white text-[#161823]"
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#e5e7ea] px-4">
          <div className="flex min-w-0 items-center gap-2 text-[13px]">
            <span className="text-[rgba(22,24,35,0.48)]">工作台</span>
            <ChevronRight size={14} className="text-[rgba(22,24,35,0.26)]" />
            <strong className="truncate font-semibold text-[#161823]">数据开发</strong>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md border border-[#e2e5e9] bg-[#fafbfc] px-2.5 py-1.5 text-[12px] text-[rgba(22,24,35,0.68)] sm:flex">
              <Cloud size={14} />
              开发环境
              <Circle size={7} fill="#20b26b" className="text-[#20b26b]" />
            </div>
            <Tooltip title={fullscreen ? '退出沉浸模式' : '沉浸模式'}>
              <Button
                type="text"
                size="small"
                icon={fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                onClick={() => setFullscreen((value) => !value)}
              />
            </Tooltip>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {explorerVisible && !fullscreen && (
            <aside className="flex w-[292px] shrink-0 flex-col border-r border-[#e5e7ea] bg-[#fbfbfc]">
              <div className="border-b border-[#e7e9ec] p-3">
                <div className="flex items-center justify-between gap-2">
                  <Select
                    variant="borderless"
                    className="min-w-0 flex-1 [&_.ant-select-selector]:!px-0"
                    defaultValue="user-data-platform"
                    options={[
                      { label: '用户数据平台', value: 'user-data-platform' },
                      { label: '实时数仓项目', value: 'realtime-warehouse' },
                    ]}
                  />
                  <Tooltip title="收起项目目录">
                    <Button
                      type="text"
                      size="small"
                      icon={<PanelLeftClose size={15} />}
                      onClick={() => setExplorerVisible(false)}
                    />
                  </Tooltip>
                </div>

                <Input
                  allowClear
                  variant="filled"
                  prefix={<Search size={14} />}
                  placeholder="搜索文件 / 目录"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  className="mt-2"
                />

                <div className="mt-2 flex items-center gap-1">
                  {[
                    ['all', '全部'],
                    ['owned', '我负责的'],
                    ['favorite', '我收藏的'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setExplorerFilter(value as ExplorerFilter)}
                      className={[
                        'h-7 flex-1 rounded-md border-0 px-2 text-[11px] transition-colors',
                        explorerFilter === value
                          ? 'bg-[var(--yak-brand-color-soft)] font-medium text-[var(--yak-brand-color)]'
                          : 'bg-transparent text-[rgba(22,24,35,0.56)] hover:bg-[#f0f1f2]',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  ))}

                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: CREATE_MENU_ITEMS,
                      onClick: ({ key }) => openCreateModal(key as WorkspaceFileKind),
                    }}
                  >
                    <Button
                      type="primary"
                      size="small"
                      aria-label="新建开发节点"
                      icon={<Plus size={15} />}
                      className="!h-7 !w-7 !px-0"
                    />
                  </Dropdown>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                <div className="px-2 pb-1 text-[11px] font-semibold text-[rgba(22,24,35,0.48)]">
                  数据开发项目
                </div>

                {FOLDER_GROUPS.map((group) => {
                  const groupFiles = visibleFiles.filter(
                    (file) => file.folder === group.id,
                  );
                  const expanded = expandedFolders[group.id];
                  if (groupFiles.length === 0 && keyword) return null;

                  return (
                    <div key={group.id} className="mb-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFolders((current) => ({
                            ...current,
                            [group.id]: !current[group.id],
                          }))
                        }
                        className="flex h-7 w-full items-center gap-1.5 rounded-[5px] border-0 bg-transparent px-1.5 text-left text-[12px] font-medium text-[rgba(22,24,35,0.76)] hover:bg-[#f2f3f4]"
                      >
                        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        {expanded ? (
                          <FolderOpen size={15} className="text-[#f2a800]" />
                        ) : (
                          <Folder size={15} className="text-[#f2a800]" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{group.label}</span>
                        <span className="text-[10px] font-normal text-[rgba(22,24,35,0.3)]">
                          {groupFiles.length}
                        </span>
                      </button>

                      {expanded && (
                        <div className="ml-[22px] border-l border-[#e6e8eb] pl-1.5">
                          {groupFiles.length > 0 ? (
                            groupFiles.map(renderFileRow)
                          ) : (
                            <div className="px-2 py-1 text-[11px] text-[rgba(22,24,35,0.32)]">
                              暂无节点
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex h-9 shrink-0 items-center justify-between border-t border-[#e7e9ec] px-3 text-[11px] text-[rgba(22,24,35,0.46)]">
                <span className="flex items-center gap-1.5">
                  <Trash2 size={13} /> 回收站
                </span>
                <span>{files.length} 个节点</span>
              </div>
            </aside>
          )}

          <main className="flex min-w-0 flex-1 flex-col bg-white">
            <div className="flex h-10 shrink-0 items-stretch border-b border-[#e5e7ea] bg-[#fafbfc]">
              {!explorerVisible && !fullscreen && (
                <Tooltip title="展开项目目录">
                  <Button
                    type="text"
                    className="!h-10 !rounded-none"
                    icon={<PanelLeftOpen size={15} />}
                    onClick={() => setExplorerVisible(true)}
                  />
                </Tooltip>
              )}

              <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
                {tabFiles.map((file) => {
                  const meta = FILE_KIND_META[file.kind];
                  const Icon = meta.icon;
                  const active = file.id === activeFileId;
                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setActiveFileId(file.id)}
                      className={[
                        'group relative flex h-10 min-w-[150px] max-w-[230px] items-center gap-2 border-0 border-r border-[#e7e9ec] px-3 text-left text-[12px]',
                        active
                          ? 'bg-white text-[#161823]'
                          : 'bg-[#f7f8f9] text-[rgba(22,24,35,0.54)] hover:bg-white',
                      ].join(' ')}
                    >
                      {active && (
                        <span className="absolute inset-x-0 top-0 h-0.5 bg-[var(--yak-brand-color)]" />
                      )}
                      <Icon size={14} className={active ? meta.iconClassName : ''} />
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      {file.dirty ? (
                        <Circle
                          size={7}
                          fill="currentColor"
                          className="shrink-0 text-[var(--yak-brand-color)]"
                        />
                      ) : (
                        <X
                          size={13}
                          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            closeTab(file.id);
                          }}
                        />
                      )}
                    </button>
                  );
                })}

                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: CREATE_MENU_ITEMS,
                    onClick: ({ key }) => openCreateModal(key as WorkspaceFileKind),
                  }}
                >
                  <Button
                    type="text"
                    className="!h-10 !w-10 !shrink-0 !rounded-none"
                    icon={<Plus size={15} />}
                  />
                </Dropdown>
              </div>
            </div>

            <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-[#e5e7ea] px-2">
              <div className="flex min-w-0 items-center gap-1">
                <Select
                  variant="filled"
                  size="small"
                  className="w-[125px] shrink-0"
                  value={activeFile?.engine}
                  disabled={!activeFile}
                  options={ENGINE_OPTIONS}
                  onChange={(engine) =>
                    activeFile && updateFile(activeFile.id, { engine, dirty: true })
                  }
                />
                <span className="mx-1 h-5 w-px bg-[#e4e6e9]" />
                <ToolButton
                  label={running ? '运行中' : '运行'}
                  icon={running ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
                  disabled={!activeFile || running}
                  onClick={runActive}
                />
                <ToolButton
                  label="停止"
                  icon={<Square size={14} />}
                  disabled={!running}
                  onClick={() => setRunning(false)}
                />
                <ToolButton
                  label="保存"
                  icon={<Save size={15} />}
                  disabled={!activeFile}
                  onClick={saveActive}
                />
                <ToolButton
                  label="格式化"
                  icon={<WandSparkles size={15} />}
                  disabled={!activeFile}
                  onClick={formatActive}
                />
                <ToolButton
                  label="刷新"
                  icon={<RefreshCw size={15} />}
                  disabled={!activeFile}
                  onClick={() => message.success('内容已刷新')}
                />
                <ToolButton
                  label="发布"
                  icon={<Send size={15} />}
                  disabled={!activeFile}
                  onClick={() => {
                    saveActive();
                    message.success('发布流程已创建');
                  }}
                />
                <ToolButton
                  label="深度检查"
                  icon={<CheckCircle2 size={15} />}
                  disabled={!activeFile}
                  onClick={() => message.success('语法与依赖检查通过')}
                />
                <ToolButton
                  label="分享"
                  icon={<Share2 size={15} />}
                  disabled={!activeFile}
                  onClick={() => message.success('分享链接已复制')}
                />
              </div>

              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    { key: 'copy', label: '复制节点', icon: <Copy size={14} /> },
                    { key: 'history', label: '查看版本', icon: <HistoryIcon size={14} /> },
                    { type: 'divider' },
                    { key: 'delete', label: '删除节点', danger: true, icon: <Trash2 size={14} /> },
                  ],
                  onClick: ({ key }) => {
                    if (key === 'history') setRightPanel('version');
                    if (key === 'copy') message.success('节点副本已创建');
                    if (key === 'delete') deleteActiveFile();
                  },
                }}
              >
                <Button type="text" size="small" icon={<MoreHorizontal size={16} />} />
              </Dropdown>
            </div>

            <div className="min-h-0 flex-1">
              {activeFile ? (
                <CodeEditor
                  key={activeFile.id}
                  value={activeFile.content}
                  kind={activeFile.kind}
                  onChange={updateActiveContent}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[#fbfbfc] p-8">
                  <div className="w-full max-w-[620px] text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--yak-brand-color-soft)] text-[var(--yak-brand-color)]">
                      <Code2 size={28} />
                    </div>
                    <h2 className="mb-1 mt-4 text-lg font-semibold">Yak-ops 数据开发</h2>
                    <p className="m-0 text-[13px] text-[rgba(22,24,35,0.48)]">
                      从左侧打开开发节点，或新建 SQL、Python、Shell 和 Notebook 任务。
                    </p>
                    <Button
                      type="primary"
                      className="mt-5"
                      icon={<Plus size={15} />}
                      onClick={() => openCreateModal('sql')}
                    >
                      新建开发节点
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <footer className="flex h-7 shrink-0 items-center justify-between border-t border-[#e5e7ea] bg-[#fafbfc] px-3 text-[11px] text-[rgba(22,24,35,0.48)]">
              <div className="flex items-center gap-4">
                <span>项目：用户数据平台</span>
                <span className="flex items-center gap-1.5">
                  环境：开发环境
                  <Circle size={6} fill="#20b26b" className="text-[#20b26b]" />
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span>行 1，列 1</span>
                <span>空格: 2</span>
                <span>UTF-8</span>
                <span>LF</span>
                <span>{activeFile?.engine ?? 'Yak SQL'}</span>
                <span className="flex items-center gap-1 text-[#14945f]">
                  <CheckCircle2 size={12} /> 语法检查通过
                </span>
              </div>
            </footer>
          </main>

          {!fullscreen && renderRightPanelContent()}

          {!fullscreen && (
            <nav className="flex w-14 shrink-0 flex-col border-l border-[#e5e7ea] bg-[#fbfbfc] py-1">
              {[
                ['properties', '属性', FileJson2],
                ['run', '运行配置', SlidersHorizontal],
                ['schedule', '调度配置', Clock3],
                ['version', '版本', GitBranch],
              ].map(([key, label, Icon]) => {
                const active = rightPanel === key;
                const RailIcon = Icon as ComponentType<{ size?: number }>;
                return (
                  <button
                    key={String(key)}
                    type="button"
                    onClick={() =>
                      setRightPanel((current) =>
                        current === key ? null : (key as RightPanelKey),
                      )
                    }
                    className={[
                      'relative flex min-h-[92px] flex-col items-center justify-center gap-2 border-0 bg-transparent px-1 text-[11px] transition-colors [writing-mode:vertical-rl]',
                      active
                        ? 'bg-white text-[var(--yak-brand-color)]'
                        : 'text-[rgba(22,24,35,0.54)] hover:bg-white hover:text-[#161823]',
                    ].join(' ')}
                  >
                    {active && (
                      <span className="absolute inset-y-0 left-0 w-0.5 bg-[var(--yak-brand-color)]" />
                    )}
                    <RailIcon size={16} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        <Modal
          title="新建开发节点"
          open={createOpen}
          centered
          width={520}
          okText="创建节点"
          cancelText="取消"
          destroyOnHidden
          onCancel={() => {
            setCreateOpen(false);
            form.resetFields();
          }}
          onOk={() => form.submit()}
        >
          <Form<CreateFileValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={handleCreate}
            className="pt-3"
          >
            <Form.Item
              name="kind"
              label="节点类型"
              rules={[{ required: true, message: '请选择节点类型' }]}
            >
              <Select
                variant="filled"
                options={Object.entries(FILE_KIND_META).map(([value, meta]) => ({
                  value,
                  label: meta.label,
                }))}
                onChange={(kind: WorkspaceFileKind) =>
                  form.setFieldValue('folder', FILE_KIND_META[kind].defaultFolder)
                }
              />
            </Form.Item>
            <Form.Item
              name="name"
              label="节点名称"
              rules={[
                { required: true, whitespace: true, message: '请输入节点名称' },
                { max: 80, message: '节点名称不能超过 80 个字符' },
              ]}
            >
              <Input variant="filled" placeholder="例如：mysql_sql_etl" />
            </Form.Item>
            <Form.Item
              name="folder"
              label="所属目录"
              rules={[{ required: true, message: '请选择所属目录' }]}
            >
              <Select
                variant="filled"
                options={FOLDER_GROUPS.map((folder) => ({
                  value: folder.id,
                  label: folder.label,
                }))}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

const PanelField = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-[12px] font-medium text-[rgba(22,24,35,0.68)]">
      {label}
    </span>
    {children}
  </label>
);

export default DataDevelopmentWorkbenchPage;
