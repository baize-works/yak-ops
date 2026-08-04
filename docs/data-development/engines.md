# Yak Ops 数据开发引擎

第三阶段在既有控制面与执行闭环上增加四种可运行的数据开发引擎。所有引擎继续复用统一的 Task Plugin、Execution、Attempt、Event、Result 和 SSE 协议。

## 引擎清单

| Task Type | 执行方式 | 结果类型 | 取消方式 |
| --- | --- | --- | --- |
| `SQL` | 标准 JDBC | `TABLE` | `Statement.cancel()` |
| `FLINK_SQL` | Flink SQL Gateway REST API | `TABLE` | Gateway Operation Cancel |
| `PYTHON` | 本地 Python 子进程 | `TERMINAL` | 终止进程树 |
| `NOTEBOOK` | 顺序执行 Python / Shell / Markdown Cell | `NOTEBOOK` | 终止当前 Cell 进程树 |

HTTP 与 Shell 引擎保持原有实现。

## 双 Factory 设计

每个新引擎同时提供两个 ServiceLoader Provider：

```text
TaskPluginFactory
  -> 默认 Definition
  -> Definition 规范化
  -> 校验和编译
  -> Workbench 插件目录

WorkflowTaskPluginFactory
  -> Attempt 级 Executor
  -> 参数解析
  -> 执行与取消
```

这样数据开发控制面可以得到正确的代码或 Notebook 默认内容，而执行网关仍然通过现有 `WorkflowTaskExecutorRegistry` 创建独立 Executor。

## JDBC SQL

JDBC SQL 支持查询和 DML：

- SQL 正文保存在统一 Definition 的 `content.value`；
- 运行配置包括 JDBC URL、账号、驱动类、最大行数、Fetch Size 和查询超时；
- 查询返回列定义和行数据；
- DML 返回 `affectedRows`；
- 超过 `maxRows` 时设置 `truncated=true`；
- 取消调用 JDBC `Statement.cancel()`。

数据库驱动必须位于 Yak Ops 运行时 Classpath。Boot 当前自带 MySQL 驱动，其他数据库需要按部署环境补充对应驱动。

## Flink SQL Gateway

Flink SQL 通过 SQL Gateway v1 API 执行：

```text
POST /v1/sessions
POST /v1/sessions/{session}/statements
GET  /v1/sessions/{session}/operations/{operation}/result/{token}
DELETE /v1/sessions/{session}/operations/{operation}/cancel
DELETE /v1/sessions/{session}
```

引擎支持 Session Properties、请求超时、轮询间隔和最大结果行数。Gateway 返回的列和行会转换为工作台的标准 Table Result。

## Python

Python 引擎将代码写入一次性临时文件，并使用配置的 Python 可执行文件启动子进程：

- 支持命令行参数；
- 支持工作目录；
- 支持 `KEY=VALUE` 环境变量；
- stdout 与 stderr 分开保存；
- 输出行数受 `maxOutputLines` 限制；
- 取消会终止整个进程树；
- 临时脚本在执行结束后删除。

该引擎不会自动安装 requirements。Python 环境和依赖应由部署侧预先准备，后续可扩展独立虚拟环境和依赖缓存。

## Notebook

Notebook 按 Cell 顺序执行，当前支持：

- `markdown`：直接作为成功结果；
- `python`：通过 Python 子进程执行；
- `shell`：通过系统 Shell 执行。

每个 Cell 返回 ID、标题、状态、耗时和输出。可以配置单 Cell 超时、失败后继续和最大输出行数。Notebook 的失败结果也会持久化已经完成的 Cell 输出，便于排查。

## 前端结果协议

工作台继续复用已有 Renderer：

```text
SQL / FLINK_SQL -> TableExecutionResult
PYTHON          -> TerminalExecutionResult
NOTEBOOK        -> NotebookExecutionResult
```

运行面板不依赖具体引擎实现，只读取持久化的 `result_kind` 和 `payload_json`。

## 安全边界

Python、Shell 和 Notebook 会在 Yak Ops 主机执行本地进程，只应开放给可信用户，并建议后续增加：

1. 独立 Worker 用户和文件系统沙箱；
2. 容器化执行；
3. CPU、内存、进程数和网络限制；
4. 数据源凭证引用，不在 Definition 中保存明文密码；
5. SQL 只读策略和语句审计；
6. Flink Gateway 的认证与 TLS。

## 后续范围

本阶段不包含：

- 分布式 Worker 和资源调度；
- Python requirements 自动安装；
- JDBC 大结果 Dataset 分页；
- Flink 长期流式 Job 的运维托管；
- Notebook 共享内核；
- Spark SQL、Trino、Hive 等独立引擎；
- 引擎级重试策略。
