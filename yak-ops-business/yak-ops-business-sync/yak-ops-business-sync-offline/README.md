# Yak Ops Offline Sync Control Plane

该模块把 Yak Ops 定位为 **离线同步控制面**，把 Link-Up 定位为 **单节点离线同步 Worker**。两者只处理有明确开始和结束的批量同步，不引入 CDC、流式 Deployment、Checkpoint、Savepoint、暂停恢复等实时语义。

## 职责边界

Yak Ops 负责：

- 保存任务定义和不可变任务版本；
- 保存 Cron 调度与重试策略；
- 创建并持久化执行历史；
- 选择并记录 Link-Up Worker；
- 生成 `externalExecutionId` 和 `idempotencyKey`；
- 后台持续对账 Link-Up 作业状态；
- 汇总执行指标、状态事件和日志；
- 判定 `LOST`、创建重试实例并产生告警事件。

Link-Up 负责：

- 接收一次离线同步作业；
- 排队、运行、取消并返回最终结果；
- 暴露 Worker 身份、状态、指标、Pipeline 和 Task 信息。

## 核心组件

```text
OfflineJobDefinitionService       当前定义、上线下线和版本目录
OfflineDefinitionSupport          定义序列化、HOCON 生成和展示映射
OfflineExecutionOrchestrator      执行命令、幂等提交和状态持久化
OfflineExecutionReadService       执行历史、指标和日志读模型
OfflineJobExecutionService        Controller 使用的执行门面
OfflineWorkerRegistry             单 Worker 心跳、身份校验和选择
OfflineExecutionReconciler        后台状态对账、LOST 判定和重试派发
OfflineScheduleDispatcher         持久化 Cron 调度派发
OfflineAlertPublisher             告警持久化和应用事件发布

OfflineDefinitionCatalogRepository 不可变任务版本
OfflineScheduleRepository          调度与重试策略
OfflineNodeRepository              Worker 节点和心跳
OfflineExecutionControlRepository  执行事件、重试扫描和告警记录
```

## Link-Up 协议

Yak Ops 使用 Link-Up 单节点离线 Worker 协议：

```http
GET    /api/v1/node
POST   /api/v1/jobs
GET    /api/v1/jobs/{jobId}
GET    /api/v1/jobs/external/{externalExecutionId}
DELETE /api/v1/jobs/{jobId}
```

提交体：

```json
{
  "externalExecutionId": "yak-offline-execution-10086",
  "idempotencyKey": "0a20a977-34fa-4bc8-8f84-4f8ef6d89e9f",
  "definitionVersion": 3,
  "hocon": "job { ... }"
}
```

执行状态严格映射为：

```text
CREATED -> SUBMITTED -> QUEUED -> RUNNING
                                      |-> SUCCEEDED
                                      |-> FAILED
                                      |-> CANCELED
                                      `-> LOST
```

## 数据模型

Flyway V2 增加：

- `yak_offline_job_version`
- `yak_offline_schedule`
- `yak_offline_engine_node`
- `yak_offline_execution_event`
- `yak_offline_alert_event`

并扩展 `yak_offline_job_execution`，保存定义版本、节点、幂等标识、状态版本、重试关系和最近对账时间。

## 告警扩展

`OfflineAlertPublisher` 先把告警写入 `yak_offline_alert_event`，再发布 `OfflineExecutionAlertEvent`。邮件、Webhook、企业微信等渠道只需订阅该事件并更新投递状态，不需要侵入离线执行编排。
