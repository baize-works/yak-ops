# 数据开发执行闭环

## 目标

第二阶段在第一阶段控制面之上补齐单机执行闭环，复用现有 HTTP、Shell Task Plugin，不把插件逻辑复制到数据开发模块。

```text
Workbench
  -> POST Execution Snapshot
  -> Execution Gateway
  -> bounded local queue
  -> Task Plugin Worker
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

Worker 通过 `WorkflowTaskExecutorRegistry` 创建真实插件执行器：

- HTTP 使用 JDK HttpClient，支持取消、超时、响应头和响应体输出；
- Shell 使用 ProcessBuilder，支持进程树终止和逐行日志；
- runtime parameters 与 execution input 合并到插件参数命名空间；
- 插件结果转换为统一 `yak_dev_execution_result`。

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

本阶段完成 HTTP、Shell 的单机执行闭环。SQL、Flink SQL、Python、Notebook、分布式 Worker、结果 Dataset 分页和多 Attempt 重试策略留在后续阶段。
