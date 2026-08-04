# Yak Ops 数据开发 Workbench 架构

本文档定义 `/data-development/workbench` 的前端架构、统一资源模型、节点插件协议、动态渲染器、动态工具栏以及后续后端持久化建议。

目标不是只做一个“长得像 IDE”的页面，而是形成一个可以持续扩展 SQL、Flink SQL、Python、Shell、HTTP、Notebook、数据集成、质量规则和 AI 节点的轻量数据开发 Workbench Kernel。

## 1. 设计目标

1. 左侧以项目、目录和开发资源组织内容。
2. 中间内容不限定为代码编辑器，可以是表单、Notebook、图形画布、表格或自定义页面。
3. 每种节点拥有独立的运行参数、能力开关和工具栏动作。
4. 新增节点时不修改 Workbench 核心页面，不在组件中继续堆积 `if/else`。
5. 资源元数据、可编辑文档、运行实例和发布版本相互分离。
6. Mock Repository 与 HTTP Repository 可以平滑替换。
7. 所有持久化 JSON 都携带 `resourceType` 和 `schemaVersion`，支持历史数据迁移。

## 2. 核心领域模型

### 2.1 DevelopmentResource

`DevelopmentResource` 表示左侧项目树中的稳定资源元数据。

```ts
interface DevelopmentResource {
  id: string;
  projectId: string;
  parentId: string | null;
  folderId: string;
  nodeType: 'FOLDER' | 'ARTIFACT';
  resourceType: string;
  name: string;
  engine: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  schemaVersion: number;
  latestRevision: number;
  publishedVersion?: number;
}
```

资源必须使用稳定 `id`，不能用文件名作为唯一标识。文件可重命名、移动目录，不应影响标签页、版本、运行实例和调度引用。

### 2.2 DevelopmentDocument

资源元数据和可编辑内容分开保存。树接口只返回资源元数据，打开节点时再加载文档。

```ts
interface DevelopmentDocument {
  resourceId: string;
  revision: number;
  schemaVersion: number;
  content: ResourceContent;
  config: Record<string, unknown>;
  runtime: {
    common: CommonRuntimeConfig;
    specific: Record<string, unknown>;
  };
  dirty: boolean;
  loadStatus: 'IDLE' | 'LOADING' | 'READY' | 'ERROR';
  saveStatus: 'IDLE' | 'SAVING' | 'ERROR' | 'CONFLICT';
}
```

### 2.3 ResourceContent

中间内容使用带 `kind` 的统一 JSON 信封，而不是全部强行转成文本编辑器。

```ts
type ResourceContent =
  | { kind: 'text'; language: string; value: string }
  | { kind: 'form'; value: Record<string, unknown> }
  | { kind: 'graph'; nodes: GraphNode[]; edges: GraphEdge[] }
  | { kind: 'notebook'; cells: NotebookCell[] }
  | { kind: 'custom'; rendererKey: string; value: unknown };
```

推荐映射：

| 内容 | Renderer |
| --- | --- |
| SQL、Flink SQL、Python、Shell | CodeResourceRenderer |
| HTTP、普通配置、资源文件 | SchemaFormRenderer |
| Notebook | NotebookRenderer |
| 数据集成、流程图 | IntegrationRenderer / 自定义 Renderer |
| 后续 ER 图、质量规则、AI 节点 | 独立 Renderer |

JSON Schema 适合字段表单和运行参数，不适合承包复杂拖拽画布。复杂内容继续使用独立 React Renderer，但最终数据仍保存为标准 JSON。

## 3. 总体结构

```text
workbench/
├── index.tsx
├── WorkbenchPage.tsx
├── core/
│   ├── types.ts
│   ├── registry.ts
│   ├── bootstrap.ts
│   ├── actions.tsx
│   └── commands.ts
├── store/
│   └── workbench.store.ts
├── components/
│   ├── ExplorerPanel.tsx
│   ├── EditorTabs.tsx
│   ├── WorkbenchToolbar.tsx
│   ├── ResourceView.tsx
│   ├── RightPanel.tsx
│   ├── RightRail.tsx
│   ├── StatusBar.tsx
│   └── CreateResourceModal.tsx
├── renderers/
│   ├── CodeResourceRenderer.tsx
│   ├── SchemaFormRenderer.tsx
│   ├── NotebookRenderer.tsx
│   └── IntegrationRenderer.tsx
├── plugins/
│   ├── index.ts
│   ├── shared.ts
│   ├── sql.tsx
│   ├── flink-sql.tsx
│   ├── python.tsx
│   ├── shell.tsx
│   ├── notebook.tsx
│   ├── data-integration.tsx
│   ├── http.tsx
│   └── resource.tsx
└── mock/
    └── workspace.ts
```

依赖原则：

- Workbench Shell 不知道 SQL、HTTP、Notebook 的具体实现。
- Plugin 只声明元数据、能力、Renderer、运行参数和 Action。
- Renderer 只负责编辑某类 `ResourceContent`。
- Action 决定按钮如何展示和何时可用。
- Command 负责保存、运行、发布、校验等业务动作。
- Store 保存标准化状态和稳定 ID 引用。

## 4. NodePluginDefinition

节点插件是扩展协议的核心。

```ts
interface NodePluginDefinition {
  type: string;
  version: number;
  metadata: {
    label: string;
    description: string;
    category: string;
    folderId: string;
    folderLabel: string;
    folderOrder: number;
    icon: React.ComponentType;
    extension?: string;
    defaultEngine: string;
  };
  capabilities: NodeCapabilities;
  authoring: {
    rendererKey: string;
    schema?: WorkbenchFormSchema;
    createDefaultContent(name: string): ResourceContent;
  };
  runtime?: {
    schema: WorkbenchFormSchema;
    defaultValue(): Record<string, unknown>;
  };
  toolbar: string[];
  migrations?: NodeMigration[];
}
```

新增节点的标准步骤：

1. 在 `plugins/<node>/` 中新增插件定义。
2. 声明唯一 `type` 和 `version`。
3. 选择已有 Renderer，或注册新的 Renderer。
4. 定义默认内容和专属运行参数 Schema。
5. 声明工具栏 Action ID。
6. 在 `plugins/index.ts` 注册插件。

Workbench、Explorer、Tabs、RightPanel 不需要增加该节点的条件分支。

## 5. Registry

### NodePluginRegistry

保存节点类型定义：

```ts
nodePluginRegistry.register('HTTP', httpPlugin);
const plugin = nodePluginRegistry.get(resource.resourceType);
```

### RendererRegistry

根据 `rendererKey` 选择中间区域：

```ts
rendererRegistry.register('code', CodeResourceRenderer);
rendererRegistry.register('schema-form', SchemaFormRenderer);
rendererRegistry.register('notebook', NotebookRenderer);
rendererRegistry.register('integration', IntegrationRenderer);
```

### ActionRegistry

Action 描述按钮的名称、图标、分组、显示条件、可用条件和 loading 状态。

```ts
interface WorkbenchActionDefinition {
  id: string;
  label: string;
  command: string;
  group: ToolbarGroup;
  order: number;
  visible?(context): boolean;
  enabled?(context): boolean;
  loading?(context): boolean;
}
```

### CommandRegistry

按钮、右键菜单、快捷键和命令面板最终都应调用同一个 Command：

```ts
commandRegistry.execute('document.save', context);
```

按钮组件不直接包含保存、运行和发布的复杂业务逻辑。

## 6. 动态工具栏

插件只声明 Action ID：

```ts
toolbar: [
  'execution.run',
  'execution.stop',
  'document.save',
  'document.format',
  'version.publish',
  'resource.share',
];
```

不同节点可拥有完全不同的工具栏：

- SQL：运行、停止、保存、格式化、刷新、发布、检查、分享。
- HTTP：测试请求、停止、保存、格式化、发布、查看响应、分享。
- Notebook：运行全部、中断、保存、清空输出、发布、分享。
- 数据集成：运行、停止、保存、自动布局、检查、预览、发布、分享。
- 资源文件：保存、格式化、刷新、分享。

同一个 Action 也会根据上下文动态变化。例如运行中隐藏“运行”并展示“停止”，未保存文档禁用“发布”。

JSON Manifest 可以决定展示哪些 Action ID，但不能携带 JavaScript 函数、React 组件或接口调用代码。可执行实现必须来自前端注册表。

## 7. 节点运行参数

运行参数分为公共参数和节点专属参数。

```json
{
  "common": {
    "environmentId": "development",
    "timeoutSeconds": 3600,
    "retryTimes": 1,
    "workerGroup": "default"
  },
  "specific": {
    "parallelism": 4,
    "checkpointIntervalSeconds": 60
  }
}
```

插件通过 `runtime.schema` 定义专属参数，右侧运行配置面板统一使用 `SchemaDrivenForm` 渲染。因此 Flink SQL、Shell、Python、HTTP、Notebook 和数据集成可以拥有不同参数，而 RightPanel 不需要知道字段含义。

后端仍必须按 `resourceType` 使用强类型 DTO 再次校验，不能只信任前端 JSON。

## 8. 标准化 Zustand Store

Store 不保存嵌套巨树，也不把完整 Resource 复制到每个 Tab。

```ts
interface WorkbenchStoreState {
  resourcesById: Record<string, DevelopmentResource>;
  documentsByResourceId: Record<string, DevelopmentDocument>;
  resourceIdsByFolder: Record<string, string[]>;
  openResourceIds: string[];
  activeResourceId?: string;
  executionStatusByResourceId: Record<string, ExecutionStatus>;
}
```

优势：

- 重命名或移动资源只更新一份实体。
- 标签页只保存资源 ID。
- 文档编辑不会重建整棵树。
- 可以按目录懒加载。
- 多个资源可同时拥有独立执行状态。

组件应使用 selector 订阅最小状态，避免编辑一个字符时重渲染整套 IDE。

## 9. 保存、发布和运行语义

### 保存

保存请求携带 `baseRevision`。后端当前 revision 已变化时返回冲突，不能静默覆盖。

```json
{
  "content": {},
  "config": {},
  "runtime": {},
  "baseRevision": 18
}
```

### 发布

发布不是简单修改状态，而是从草稿 Revision 创建不可变 Published Version：

```text
Draft Revision 18 -> publish -> Published Version 5
```

调度必须绑定发布版本，而不是持续变化的草稿。

### 运行

运行当前未保存内容时必须创建执行快照：

```ts
interface RunResourceRequest {
  resourceId: string;
  revision: number;
  contentSnapshot?: ResourceContent;
  runtimeSnapshot: RuntimeConfig;
}
```

这样用户后续修改代码后，仍然可以复现当次运行内容。

## 10. 后端模型与接口建议

推荐领域关系：

```text
DevelopmentProject
└── DevelopmentResource
    ├── ResourceDocument
    ├── RuntimeConfig
    ├── ScheduleConfig
    ├── PublishedVersion
    └── ExecutionInstance
```

建议数据表：

```text
yak_dev_project
yak_dev_resource
yak_dev_document
yak_dev_published_version
yak_dev_schedule
yak_dev_execution
yak_dev_execution_log
```

目录树使用邻接表：`resource.parent_id`、`resource.project_id`、`resource.order_index`。不建议把整个项目目录保存为一棵巨型 JSON 树。

Repository 接口建议：

```ts
interface WorkbenchRepository {
  getChildren(projectId: string, parentId?: string): Promise<DevelopmentResource[]>;
  getDocument(resourceId: string): Promise<DevelopmentDocument>;
  saveDocument(resourceId: string, request: SaveDocumentRequest): Promise<DevelopmentDocument>;
  publishResource(resourceId: string, revision: number): Promise<PublishedVersion>;
  runResource(resourceId: string, request: RunResourceRequest): Promise<ExecutionInstance>;
}
```

第一阶段使用 `MockWorkbenchRepository`，后续替换为 `HttpWorkbenchRepository`，UI、Store 和插件无需变化。

## 11. Schema Migration

插件升级字段结构时必须迁移旧数据：

```ts
interface NodeMigration {
  fromVersion: number;
  toVersion: number;
  migrate(document: DevelopmentDocument): DevelopmentDocument;
}
```

`schemaVersion` 应从第一版开始持久化。迁移必须逐版本执行，禁止直接假设所有历史数据已经是最新版。

## 12. 与 OpenSumi 的关系

Yak Ops 借鉴 OpenSumi 的模块化思想：View、Model、Service 分离，Resource 使用稳定标识，Editor/Renderer 通过注册表扩展，Command、Menu、Toolbar 复用。

当前不完整嵌入 OpenSumi，也不实现通用 VS Code 扩展宿主。Yak Ops Workbench 聚焦数据工程，继续复用现有 Umi、Ant Design、TailwindCSS、CodeMirror、ReactFlow 和 Zustand 技术栈，避免两套布局、主题、DI 和命令系统并存。

## 13. 实施阶段

### 当前 PR

- 拆分原单文件 Workbench。
- 建立 NodePlugin、Renderer、Action、Command 注册体系。
- 建立标准化 Zustand Store。
- 提供 Code、Schema Form、Notebook、Integration Renderer。
- 提供 SQL、Flink SQL、Python、Shell、HTTP、Notebook、数据集成和资源文件插件。
- 验证动态工具栏和不同运行参数。

### 第二阶段

- Project、Resource、Document 后端接口。
- 目录懒加载。
- revision 保存和冲突处理。
- 自动保存及离开页面保护。

### 第三阶段

- Execution API。
- SSE/WebSocket 日志流。
- Console、Result、Problems 底部面板。

### 第四阶段

- 不可变发布版本。
- 调度绑定发布版本。
- Version Diff、回滚和依赖分析。

### 第五阶段

- 多人协作。
- 命令面板和快捷键。
- AI 辅助开发。
- 外部节点插件 Manifest 与在线迁移。

## 14. 约束

1. Workbench 核心不得按具体节点类型编写业务分支。
2. JSON Manifest 只描述配置，不携带可执行代码。
3. 前端校验不能替代后端校验。
4. 发布版本和运行快照必须不可变。
5. 节点类型必须包含 `schemaVersion`。
6. 工具栏 Action 必须触发 Command，不能在按钮内部堆积业务逻辑。
7. 复杂交互优先使用 Custom Renderer，不强行使用动态表单。
8. Store 只保存标准化实体和 ID 引用。
