# Yak Ops Offline Sync Control Plane

该模块把 Yak Ops 定位为 **离线同步控制面**，把 Link-Up 定位为 **单节点离线同步 Worker**。两者只处理有明确开始和结束的批量同步，不引入 CDC、流式 Deployment、Checkpoint、Savepoint、暂停恢复等实时语义。

## 职责边界

Yak Ops 负责：

- 保存前端可编辑任务定义和不可变 JobSpec 版本；
- 根据 Connector Form Schema 收集 Connector options；
- 解析数据源引用并在服务端注入连接参数和敏感信息；
- 保存 Cron 调度与重试策略；
- 创建并持久化执行历史；
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

## 核心组件

```text
LinkUpJobSpecFactory              编辑模型与数据源引用 -> 结构化 JobSpec
OfflineDefinitionSupport         定义序列化、JobSpec 生成和展示映射
OfflineJobDefinitionService      当前定义、上线下线和不可变版本目录
OfflineExecutionOrchestrator     JobSpec 提交、幂等命令和状态持久化
OfflineExecutionReadService      执行历史、指标和日志读模型
OfflineJobExecutionService       Controller 使用的执行门面
OfflineWorkerRegistry            单 Worker 心跳、身份校验和选择
OfflineExecutionReconciler       后台状态对账、LOST 判定和重试派发
OfflineScheduleDispatcher        持久化 Cron 调度派发
OfflineAlertPublisher            告警持久化和应用事件发布
```

`LinkUpHoconBuilder` 已移除。新增 Connector 时只需让 Form Schema 产生对应 `connectorOptions`；公共 JobSpec 协议不需要增加 Doris、HTTP、文件等专用序列化分支。JDBC 当前仍由 `LinkUpJobSpecFactory` 负责将 Yak Ops 数据源 ID 解析为运行时连接 options。

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
    "sink": {"connectorId": "doris", "options": {}},
    "runtime": {"batchSize": 1000, "sourceParallelism": 2}
  }
}
```

Yak Ops 不再生成或提交 HOCON。`hocon_config` 数据库列只保留为历史兼容字段，新任务版本写入 `job_spec_json`。

## 历史任务兼容

Flyway V4：

- 为当前定义和不可变版本增加 `job_spec_json`；
- 将旧 `hocon_config` 改为可空并标记为停用；
- 将执行快照语义改为 JobSpec JSON。

历史版本没有 `job_spec_json` 时，执行器会从该版本的 `definition_json` 重新构建 JobSpec，不解析旧 HOCON，也不要求一次性迁移历史数据。
