# Workflow V2 Reader / Writer 与发布校验

## 目标

本阶段让 Workflow V2 成为可持久化、可读取、可发布的正式定义格式，同时保持 Workflow V1 的读取、编辑、发布和运行行为不变。

## API

新增 V2 写入入口：

```http
POST /api/v1/workflows/v2
PUT  /api/v1/workflows/{workflowId}/draft/v2
```

现有读取和发布入口同时支持 V1/V2：

```http
GET  /api/v1/workflows/{workflowId}
POST /api/v1/workflows/{workflowId}/publish
GET  /api/v1/workflows/{workflowId}/versions/{version}
```

响应通过 `schemaVersion` 区分格式：

- V1：`schemaVersion=1`，DAG 位于 `draft` / `dag`；
- V2：`schemaVersion=2`，DAG 位于 `draftV2` / `dagV2`。

旧客户端可以继续读取 V1 字段；新设计器根据 `schemaVersion` 选择对应 Reader。

## 持久化

Flyway 为定义和版本增加格式列：

```text
yak_wf_definition.draft_schema_version
yak_wf_version.schema_version
```

历史数据默认值为 `1`。DAG JSON 仍保存在原有 `draft_json` 和 `dag_json` 中，不复制快照，不新增平行定义表。

## Writer 约束

- V1 创建和编辑始终写入 schema 1；
- V2 创建和编辑始终写入 schema 2；
- V1/V2 编辑入口不能静默转换已有工作流格式；
- 格式迁移必须由后续显式迁移流程完成。

## V2 DAG 校验

保存草稿时执行结构校验和规范化：

- 必须且只能有一个 START，至少一个 END；
- 节点编码唯一且符合规范；
- TASK 必须绑定完整不可变 Task Version；
- START/END 禁止携带 taskRef；
- 连线节点必须存在，DAG 不得成环；
- START 不得有上游，END 不得有下游；
- FAILURE 只能来自 TASK；
- ROUTE_FAILURE 必须存在 FAILURE 连线；
- NODE_OUTPUT 只能引用拓扑上游节点；
- 输入目标不能重复；
- 重试和超时不能为负数。

## 发布校验

V2 发布前通过 `PublishedTaskVersionCatalog` 逐个校验启用的 TASK 节点：

- taskId + taskVersionId 对应的发布版本存在；
- taskVersionNumber 与真实版本一致；
- taskType 与真实版本一致；
- Input Schema 中的 required 字段已经绑定。

工作流允许固定历史不可变版本，不强制跟随任务当前最新版本。

Workflow 只依赖公共只读端口。Data Development 提供适配器，Workflow 不直接查询 `yak_dev_*` 表，也不会读取 Definition、Compiled Spec 或密钥。

## 运行边界

本阶段没有实现 V2 运行时。运行一个已发布 V2 工作流会收到明确错误：

```text
Workflow V2 执行将在统一 Task Execution Gateway 阶段启用
```

这比把 V2 JSON 误读成 V1 节点并错误执行更安全。

## 后续

下一步可直接基于 V2 Writer 重构设计器：左侧加载已发布任务资源，拖入后生成 `taskRef`，右侧仅编辑输入映射和编排策略。
