# Yak Ops 数据开发引擎（Phase One）

第一阶段只保留两类可执行 Task Plugin：

| Task Type | 节点插件 | 执行方式 | 结果类型 | 取消方式 |
| --- | --- | --- | --- | --- |
| `MYSQL` | MySQL | MySQL JDBC Driver | `TABLE` | `Statement.cancel()` |
| `HTTP` | HTTP 节点 | JDK HTTP Client | `JSON` | 取消异步请求 |

Shell、Python、Flink SQL、Notebook 与数据集成节点已从前后端移除。后续是否重新引入，必须基于新的插件边界单独设计。

## 统一插件契约

Task Plugin 同时负责编辑与执行能力：

```text
TaskPluginFactory
  -> Descriptor / 默认 Definition
  -> Definition 规范化与校验
  -> 不可变 Compiled Spec
  -> 创建 Attempt 级 TaskExecutor
```

运行时统一使用：

```text
TaskExecutionContext
TaskExecutor
TaskExecutionResult
TaskCancellationToken
TaskLogger
```

这些契约位于 `yak-ops-plugin-task-api`，不依赖 Workflow 模块。数据开发通过 `TaskPluginCatalog` 发现插件并创建独立执行器。

## MySQL

MySQL 插件支持查询和 DML：

- 节点类型固定为 `MYSQL`，不再把 JDBC 当作用户可见的节点类型；
- SQL 正文保存在 `content.value`；
- 运行配置包括 MySQL 地址、账号、驱动类、最大行数、Fetch Size 和查询超时；
- 查询返回列定义和行数据；
- DML 返回 `affectedRows`；
- 超过 `maxRows` 时设置 `truncated=true`；
- 取消调用 JDBC Driver 的 `Statement.cancel()`。

JDBC 只是 MySQL 插件内部的执行实现，不再出现在节点类型和创建流程中。为兼容历史数据，`SQL` 查询会在 `TaskPluginCatalog` 中映射到 `MYSQL`。

## HTTP

HTTP 插件支持 URL、Method、Headers、Body、请求超时、自定义成功状态码和响应体大小限制。未配置成功状态码时默认接受 `200-299`。

## 架构边界

- 数据开发负责任务、草稿、发布版本、执行快照、Attempt、事件和结果；
- Task Plugin 负责任务定义、校验、编译和一次物理执行；
- Workflow 已从当前代码库中移除，后续以独立编排模型重新设计；
- Task Plugin 不得依赖 Workflow SPI、Workflow Registry 或 Workflow 数据表。

## 后续范围

后续阶段优先处理：

1. MySQL 节点改为引用统一数据源 ID，避免在 Definition 中保存连接凭据；
2. 增加只读策略、语句审计和大结果 Dataset 分页；
3. 增加分布式 Worker、资源隔离和运行容量管理；
4. 基于不可变任务版本重新设计独立 Workflow 编排层。
