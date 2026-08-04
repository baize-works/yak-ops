# Yak Ops 数据开发后端架构

本文档定义数据开发控制面的后端边界。当前阶段不处理工作流和 Cron 调度，专注完成项目目录、任务开发、草稿、发布版本和测试运行快照。

## 1. 领域边界

```text
Resource Workspace
  Project -> Folder / Task / Asset

Task Authoring
  Task -> Draft Revision -> Immutable Task Version

Task Execution
  Execution -> Attempt -> Event / Result
```

资源树只保存名称、目录关系、负责人和排序；任务正文、运行参数、版本和执行结果不进入 `yak_dev_resource`。

## 2. Task Plugin 统一入口

新增通用 `TaskPluginFactory` 和 `TaskPluginCatalog`：

- 新插件可以直接通过 Java `ServiceLoader` 实现通用 Factory；
- 现有 `WorkflowTaskPluginFactory` 会被自动适配，因此 HTTP / Shell 不需要复制实现；
- 数据开发与未来编排层可以共享同一个 `taskType`、插件版本和配置规范；
- 插件负责默认定义、规范化、校验和编译；控制面只负责生命周期与持久化。

当前适配链路：

```text
HTTP / Shell WorkflowTaskPluginFactory
                ↓ adapter
         TaskPluginCatalog
                ↓
     Data Development Service
```

后续新增 SQL、Flink SQL、Python、Notebook 和数据集成插件时，应优先直接实现通用 `TaskPluginFactory`。

## 3. 统一任务信封

```json
{
  "schemaVersion": 1,
  "taskType": "HTTP",
  "pluginVersion": "1.0.0",
  "content": { "kind": "form", "value": {} },
  "config": {},
  "runtime": { "common": {}, "specific": {} },
  "inputs": {},
  "outputs": {}
}
```

插件可以把可视化内容编译成不同的执行 Spec。任务版本同时保存：

- `definition_snapshot`：用于回看和重新编辑；
- `compiled_spec`：用于稳定执行；
- 输入输出 Schema；
- 内容 SHA-256。

## 4. 草稿与发布

草稿使用乐观锁：

```text
PUT draft(baseRevision = 12)
  -> UPDATE ... WHERE revision = 12
  -> revision = 13
```

更新行数为 0 时返回冲突，不允许静默覆盖其他用户的修改。

发布过程在单个事务中完成：锁定 Task / Draft，校验 revision，插件编译，创建不可变版本，再更新当前发布版本指针。发布版本只新增，不更新历史快照。

## 5. 测试运行来源

`yak_dev_execution.source_type` 支持：

- `DRAFT_REVISION`：执行已保存草稿；
- `PUBLISHED_VERSION`：执行不可变发布版本；
- `EPHEMERAL_SNAPSHOT`：执行未保存内容或 SQL 当前语句。

Execution 保存完整 definition、compiled spec、runtime 和 input 快照。本 PR 先创建执行账本并提供查询、列表和取消接口，不在控制面进程内直接运行 Shell / Python；真正执行由后续 Execution Gateway / Worker 接管。

## 6. 数据表

第一版 Flyway 创建 `yak_dev_project`、`yak_dev_resource`、`yak_dev_task`、`yak_dev_task_draft`、`yak_dev_task_version`、`yak_dev_execution`、`yak_dev_execution_attempt`、`yak_dev_execution_event`、`yak_dev_execution_result` 和 `yak_dev_user_favorite`。

其中 `resource.id == task.id`，工作台、版本和执行统一使用一个稳定 Task ID。

## 7. API

```text
GET  /api/v1/data-development/task-plugins
POST /api/v1/data-development/projects
GET  /api/v1/data-development/projects
GET  /api/v1/data-development/projects/{projectId}/resources
POST /api/v1/data-development/projects/{projectId}/folders
POST /api/v1/data-development/projects/{projectId}/tasks
GET  /api/v1/data-development/tasks/{taskId}
PUT  /api/v1/data-development/tasks/{taskId}/draft
POST /api/v1/data-development/tasks/{taskId}/validate
POST /api/v1/data-development/tasks/{taskId}/versions
GET  /api/v1/data-development/tasks/{taskId}/versions
POST /api/v1/data-development/tasks/{taskId}/executions
GET  /api/v1/data-development/tasks/{taskId}/executions
GET  /api/v1/data-development/executions/{executionId}
POST /api/v1/data-development/executions/{executionId}/cancel
```

## 8. 后续阶段

1. 前端 Workbench 从 Mock Repository 切换到上述资源、草稿和插件目录 API。
2. 增加执行 Gateway、Attempt 状态机和 Worker 隔离。
3. 增加 SSE 事件流，对接底部运行结果面板。
4. SQL 表格结果使用分页 Dataset，不将大结果直接写入 MySQL。
5. 插件增加 schema migration，支持历史任务定义升级。
6. 增加资源权限、收藏、审计和版本 Diff。
