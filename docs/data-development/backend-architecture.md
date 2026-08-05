# Yak Ops 数据开发后端架构

数据开发是独立的任务开发与执行域，不承担工作流编排职责。Phase One 只支持 MySQL 与 HTTP 两类节点。

## 1. 领域边界

```text
Resource Workspace
  Project -> Folder / Task

Task Authoring
  Task -> Draft Revision -> Immutable Task Version

Task Execution
  Execution -> Attempt -> Event / Result
```

资源树只保存名称、目录关系、负责人和排序；任务正文、运行参数、版本和执行结果由任务领域独立持久化。

## 2. Task Plugin 统一入口

`TaskPluginFactory` 和 `TaskPluginCatalog` 是数据开发的唯一插件入口：

- 插件通过 Java `ServiceLoader` 注册；
- 插件负责元数据、默认 Definition、规范化、校验和编译；
- 同一个 Factory 通过 `createExecutor()` 创建 Attempt 级执行器；
- 数据开发只负责任务生命周期、快照、调度到本地 Gateway 和结果持久化；
- 插件 API 不依赖 Workflow、Spring 或具体业务模块。

当前链路：

```text
MySQL / HTTP TaskPluginFactory
               ↓ ServiceLoader
         TaskPluginCatalog
          ├─ Authoring
          └─ TaskExecutor
               ↓
Data Development Execution Gateway
```

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

任务版本同时保存：

- `definition_snapshot`：用于回看和重新编辑；
- `compiled_spec`：用于稳定执行；
- Input / Output Schema；
- 内容 SHA-256。

## 4. 草稿与发布

草稿使用乐观锁，禁止静默覆盖。发布过程在单个事务中锁定 Task 与 Draft，校验 Revision，调用插件编译，创建不可变版本，再更新当前发布版本指针。历史发布版本只新增、不修改。

## 5. 执行模型

Execution 支持：

- `DRAFT_REVISION`：执行已保存草稿；
- `PUBLISHED_VERSION`：执行不可变发布版本；
- `EPHEMERAL_SNAPSHOT`：执行未保存内容或当前 SQL 语句。

`DataDevelopmentExecutionWorker` 通过 `TaskPluginCatalog.createExecutor(taskType)` 创建物理执行器，并使用通用运行契约：

```text
TaskExecutionContext
TaskExecutor
TaskExecutionResult
TaskCancellationToken
TaskLogger
```

执行器不再通过 Workflow Registry 发现，也不读取 Workflow 定义或数据表。

## 6. 当前插件范围

```text
MYSQL -> MySQL Task Plugin -> TABLE Result
HTTP  -> JDK HTTP Client    -> JSON Result
```

JDBC 只作为 MySQL 插件的内部实现细节，不再作为节点类型。历史 `SQL` 类型通过 Catalog 兼容映射到 `MYSQL`。

Shell、Python、Flink SQL、Notebook 与数据集成插件不属于 Phase One，相关前后端实现已移除。

## 7. Workflow 边界

旧 Workflow 前端、后端模块、SPI、执行 Registry 和数据库迁移已从运行时代码中移除。历史数据库表暂不主动删除，便于审计或后续迁移。

后续 Workflow 应作为独立编排域重新设计，只引用不可变 Task Version，并负责依赖、输入输出映射、成功失败路由、重试、超时和调度策略；不得复制 MySQL/HTTP 专属配置。

## 8. 后续阶段

1. MySQL 节点改为引用统一数据源 ID；
2. 数据源凭据仅在 Worker 执行前解析，不进入任务版本和执行快照；
3. 增加 SQL 审计、只读策略和 Dataset 分页；
4. 增加分布式 Worker 与资源隔离；
5. 基于不可变 Task Version 重新设计 Workflow。
