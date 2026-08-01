# Yak Ops Offline Sync Control Plane

该模块把 Yak Ops 定位为 **离线同步控制面**，把 Link-Up 定位为 **单节点离线同步 Worker**。两者只处理有明确开始和结束的批量同步，不引入 CDC、流式 Deployment、Checkpoint、Savepoint、暂停恢复等实时语义。

## 职责边界

Yak Ops 负责：

- 先创建轻量草稿，再在配置完成后生成不可变 JobSpec 版本；
- 根据 Connector Form Schema 收集并强制校验 Connector options；
- 持久化不含数据库凭据的逻辑 JobSpec；
- 在每次执行前根据 `dataSourceRef.id` 解析最新连接参数；
- 保存 Cron 调度与重试策略；
- 原子领取任务并创建执行历史，避免手动和调度重复提交；
- 选择并记录 Link-Up Worker；
- 生成 `externalExecutionId` 和 `idempotencyKey`；
- 后台持续对账 Link-Up 作业状态；
- 汇总执行指标、状态事件和日志；
- 判定 `LOST`、创建重试实例并产生告警事件。

Link-Up 负责：

- 接收结构化 `JobSpec`；
- 将 Connector ID、options 和 runtime 编译为内部 `JobDefinition`；
- 执行 Connector 最终校验；
- 排队、运行、取消并返回最终结果；
- 暴露 Worker 身份、状态、指标、Pipeline 和 Task 信息。

## 创建和保存流程

```text
创建任务抽屉
  ↓
草稿记录（version=0、currentVersionId=NULL）
  ↓
选择数据源、表和运行参数
  ↓
前端即时校验 + 后端 Form Schema 强制校验
  ↓
逻辑 JobSpec（dataSourceRef，不含密码）
  ↓
不可变任务版本
```

草稿不能上线或运行。第一次完整保存生成版本 `1`，以后每次离线编辑保存都会增加版本号。

## 核心组件

```text
ConnectorIdResolver              数据源类型/旧标签 -> Link-Up Connector ID
LinkUpJobSpecFactory             编辑模型 -> 逻辑 JobSpec；执行前解析数据源引用
OfflineDefinitionSupport         草稿、定义序列化、Schema 校验和展示映射
OfflineJobDefinitionService      当前定义、上线下线和不可变版本目录
OfflineExecutionClaimService     行锁保护下原子创建一次执行尝试
OfflineExecutionOrchestrator     JobSpec 提交、幂等命令和状态持久化
OfflineExecutionReadService      执行历史、指标和日志读模型
OfflineJobExecutionService       Controller 使用的执行门面
OfflineWorkerRegistry            单 Worker 心跳、身份校验和选择
OfflineExecutionReconciler       后台状态对账、LOST 判定和重试派发
OfflineScheduleDispatcher        持久化 Cron 调度派发
OfflineAlertPublisher            告警持久化和应用事件发布
```

`LinkUpHoconBuilder` 已移除。新增 Connector 时只需让 Form Schema 产生对应 `connectorOptions`；公共 JobSpec 协议不需要增加 Doris、HTTP、文件等专用序列化分支。

## 逻辑与执行 JobSpec

数据库中的逻辑 JobSpec：

```json
{
  "source": {
    "connectorId": "jdbc",
    "dataSourceRef": {"id": 10001},
    "options": {"table_path": "sales.orders"}
  }
}
```

提交 Link-Up 前临时解析成：

```json
{
  "source": {
    "connectorId": "jdbc",
    "options": {
      "url": "jdbc:mysql://source:3306/demo",
      "driver": "com.mysql.cj.jdbc.Driver",
      "username": "runtime-user",
      "password": "runtime-secret",
      "table_path": "sales.orders"
    }
  }
}
```

解析后的敏感 JobSpec 只存在于本次 HTTP 请求内，不写入当前定义、不可变版本或执行快照。数据源密码轮换后，下次执行自动使用最新凭据。

## Link-Up 提交协议

```http
POST /api/v1/jobs
Content-Type: application/json
```

```json
{
  "externalExecutionId": "yak-offline-execution-10086",
  "idempotencyKey": "0a20a977-34fa-4bc8-8f84-4f8ef6d89e9f",
  "definitionVersion": 3,
  "jobSpec": {
    "apiVersion": "link-up/v1",
    "kind": "BatchSyncJob",
    "name": "orders-sync",
    "source": {"connectorId": "jdbc", "options": {}},
    "sink": {"connectorId": "jdbc", "options": {}},
    "runtime": {"batchSize": 1000, "sourceParallelism": 2}
  }
}
```

Yak Ops 不再生成或提交 HOCON。`hocon_config` 数据库列只保留为历史兼容字段，新任务版本写入 `job_spec_json`。

## 状态和命令接口

稳定执行状态：

```text
CREATED -> SUBMITTED -> QUEUED -> RUNNING
                                      |-> SUCCEEDED
                                      |-> FAILED
                                      |-> CANCELED
                                      `-> LOST
```

执行和取消只能通过 POST 命令接口：

```http
POST /api/v1/job/batch-execution/{definitionId}/execute
POST /api/v1/job/batch-execution/{executionId}/cancel
```

本地配置、序列化和协议错误立即进入 `FAILED`。只有无法判断 Worker 是否已经接收请求的传输异常才保留 `SUBMITTED`，并通过 `externalExecutionId` 后台对账。

## 调度和重试

- `retryPolicy.maxAttempts` 表示总尝试次数；
- 兼容字段 `retryTimes` 表示首次失败后的额外重试次数，因此总尝试次数为 `retryTimes + 1`；
- `retryPolicy.backoffSeconds` 和 `retryIntervalSeconds` 使用秒；
- 兼容字段 `retryInterval` 使用分钟。

## 历史任务兼容

Flyway V4：

- 为当前定义和不可变版本增加 `job_spec_json`；
- 将旧 `hocon_config` 改为可空并标记为停用；
- 将执行快照语义改为 JobSpec JSON。

Flyway V5：

- 将历史 `MYSQL`、`ORACLE`、`POSTGRE_SQL`、`DORIS` 等关系型标签统一为 `jdbc`；
- 为关系型 JobSpec 增加 `dataSourceRef.id`；
- 删除当前定义、不可变版本和执行快照中的 URL、用户名和密码等连接参数；
- 根据迁移后的逻辑 JobSpec 重新计算版本摘要。

历史版本没有 `job_spec_json` 时，执行器会从该版本的 `definition_json` 重新构建逻辑 JobSpec，不解析旧 HOCON。
