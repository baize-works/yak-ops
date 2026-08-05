# 数据开发执行闭环

## 目标

数据开发通过统一 Task Plugin 完成单机执行闭环。Phase One 只支持 JDBC SQL 与 HTTP，不依赖 Workflow 模块。

```text
Workbench
  -> POST Execution Snapshot
  -> Execution Gateway
  -> bounded local queue
  -> TaskPluginCatalog
  -> TaskExecutor
  -> Attempt / Event / Result
  -> SSE + execution detail API
  -> Workbench result panel / instance list
```

## 状态机

```text
CREATED -> QUEUED -> RUNNING -> SUCCEEDED
                            -> FAILED
                            -> CANCELED
                            -> TIMED_OUT
                            -> LOST
```

Execution 是用户提交的一次稳定快照；Attempt 是 Worker 的一次物理执行。日志按递增 sequence 持久化为 Event，输出持久化为 Result。

## 执行网关

`DataDevelopmentExecutionGateway` 使用有界线程池和队列：

- 数据库事务提交后再投递，避免 Worker 读取不到执行快照；
- 队列满时将 Execution 标记为 `FAILED`；
- 超时后调用插件取消钩子，并中断 Worker 线程；
- 应用重启时重新投递 `CREATED/QUEUED`，将失去本地上下文的 `RUNNING` 标记为 `LOST`；
- 当前阶段为单机 Worker，未来可将 Gateway 接口替换为消息队列和远程 Worker。

## 插件执行

Worker 通过 `TaskPluginCatalog.createExecutor(taskType)` 创建 Attempt 级执行器：

- SQL 使用标准 JDBC，返回 Table Result，并通过 `Statement.cancel()` 取消；
- HTTP 使用 JDK HttpClient，支持取消、超时、响应头和响应体输出；
- runtime parameters 与 execution input 合并到统一参数命名空间；
- 插件结果转换为 `yak_dev_execution_result`；
- 执行链不读取 Workflow 定义，也不依赖 Workflow Registry。

## 实时事件

```text
GET /api/v1/data-development/executions/{id}/events/stream
```

SSE 支持：

- `Last-Event-ID` / `after` 断点重放；
- 日志、排队、运行、结果和终态事件；
- 终态后主动完成连接；
- 前端断流后自动降级为详情轮询。

## 查询接口

```text
GET /api/v1/data-development/executions
GET /api/v1/data-development/executions/{id}
GET /api/v1/data-development/executions/{id}/detail
POST /api/v1/data-development/executions/{id}/cancel
```

实例页通过全局查询接口展示真实状态、执行器、耗时和执行人。Workbench 使用详情接口恢复完整日志和结果。

## 当前边界

本阶段只完成 SQL 与 HTTP 的单机执行闭环。分布式 Worker、结果 Dataset 分页、数据源 ID 引用、SQL 审计和多 Attempt 重试策略留在后续阶段。Workflow 将作为独立编排域重新设计。
