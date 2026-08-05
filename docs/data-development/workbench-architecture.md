# Yak Ops 数据开发 Workbench 架构（Phase One）

`/data-development/workbench` 是独立的数据开发界面，不承担工作流编排职责。第一阶段只注册 JDBC SQL 与 HTTP 两类节点。

## 1. 当前节点

| Resource Type | 编辑器 | 执行结果 |
| --- | --- | --- |
| `SQL` | CodeMirror SQL | Table Result |
| `HTTP` | Schema Form | JSON Result |

Flink SQL、Python、Shell、Notebook、数据集成和资源文件节点已从插件注册、工具栏、命令、Mock 数据与源码实现中移除。

## 2. 核心模型

```text
DevelopmentResource
  -> 稳定 ID、目录、名称、类型、状态

DevelopmentDocument
  -> Revision、Content、Config、Runtime

ExecutionSession
  -> Execution、日志、状态、结果
```

资源元数据、可编辑文档、发布版本和执行实例相互独立。标签页只引用稳定资源 ID，重命名和移动不会改变任务身份。

## 3. Workbench Kernel

```text
workbench/
├── core/
│   ├── registry.ts
│   ├── bootstrap.ts
│   ├── actions.tsx
│   └── commands.ts
├── plugins/
│   ├── sql.tsx
│   ├── http.tsx
│   ├── shared.ts
│   └── index.ts
├── renderers/
│   ├── CodeResourceRenderer.tsx
│   └── SchemaFormRenderer.tsx
├── execution/
│   ├── registry.ts
│   ├── definitions.ts
│   └── renderers/
│       ├── TableExecutionResultRenderer.tsx
│       └── JsonExecutionResultRenderer.tsx
└── repository/
    └── workbench.repository.ts
```

## 4. NodePluginDefinition

节点插件只声明前端展示与交互：

```ts
interface NodePluginDefinition {
  type: 'SQL' | 'HTTP';
  version: number;
  metadata: NodeMetadata;
  capabilities: NodeCapabilities;
  authoring: {
    rendererKey: 'code' | 'schema-form';
    createDefaultContent(name: string): ResourceContent;
  };
  runtime?: {
    schema: WorkbenchFormSchema;
    defaultValue(): Record<string, unknown>;
  };
  toolbar: string[];
}
```

前端插件不负责真实执行。保存、校验、发布和运行统一通过 Repository 调用后端数据开发 API。

## 5. Registry 边界

```text
NodePluginRegistry
  SQL / HTTP

RendererRegistry
  code / schema-form

ExecutionResultRegistry
  table-result / json-result

ActionRegistry + CommandRegistry
  保存 / 运行 / 停止 / 校验 / 发布
```

Workbench 页面不应为具体节点继续堆积条件分支。新增节点必须先完成后端 Task Plugin 设计，再显式扩展前端 Registry。

## 6. Definition 转换

Repository 负责把编辑器数据转换成统一 Definition：

```json
{
  "schemaVersion": 1,
  "taskType": "SQL",
  "pluginVersion": "1.0.0",
  "content": {},
  "config": {},
  "runtime": {
    "common": {},
    "specific": {}
  },
  "inputs": {},
  "outputs": {}
}
```

HTTP 编辑器中的 Headers JSON 文本会在提交前转换为对象，成功状态码文本会转换为整数数组；服务端仍负责最终规范化和校验。

## 7. 与 Workflow 的关系

Workbench 只开发和发布任务。旧 Workflow 页面和设计器已经删除。

后续 Workflow 重构后只能引用不可变 Task Version，并负责：

- 节点依赖；
- 输入输出映射；
- 成功/失败路由；
- 重试、超时与调度策略。

Workflow 不得保存 SQL、HTTP 或其他 Task Plugin 的专属配置。
