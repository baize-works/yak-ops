# yak-ops-business-job

Yak Ops 的业务调度聚合模块。时间触发统一委托给 Yak Framework
`yak-schedule`，业务模块只负责注册计划和处理触发请求。

## 目录约定

```text
io.yak.ops.business.job.schedule
├── JobScheduleRegistrar
├── JobScheduleRegistrationCoordinator
├── JobScheduleConfiguration
├── offline
│   ├── OfflineSyncScheduleRegistrar
│   ├── OfflineSyncScheduleHandler
│   └── OfflineSyncScheduleConstants
└── quality
    ├── QualityRuleScheduleRegistrar
    ├── QualityRuleScheduleHandler
    └── QualityScheduleConstants
```

后续工作流可以按相同方式新增独立目录与注册器。不要把业务状态机、
Worker 选择或业务失败重试放进调度模块。

## 离线同步接入

`OfflineSyncScheduleRegistrar` 周期性读取 `yak_offline_schedule`，将 Cron
计划同步到 Framework：

- namespace：`offline-sync`
- handler：`offlineSyncScheduleHandler`
- 并发策略：`FORBID`
- Misfire：`FIRE_ONCE_NOW`
- Framework 触发重试：`0`

离线同步原有的失败重试、重试退避、执行对账和 Worker 调度仍由
offline-sync 模块负责。

## 数据质量接入

`QualityRuleScheduleRegistrar` 周期性读取定时质量规则，将 Cron 计划同步到
Framework：

- namespace：`data-quality`
- key：`rule-{ruleId}`
- handler：`qualityRuleScheduleHandler`
- 并发策略：`FORBID`
- Misfire：`FIRE_ONCE_NOW`
- Framework 触发重试：`0`

Quartz 只负责时间触发。规则快照、活动执行防重、SQL 检查、指标判断和结果
持久化仍由 `yak-ops-business-quality` 负责。规则停用、删除或切换成手动执行后，
周期性对账会暂停或删除对应计划。

## 配置

Framework 默认使用 Quartz。Yak Ops 当前保留：

```yaml
spring:
  quartz:
    auto-startup: true
    job-store-type: memory

yak:
  schedule:
    enabled: true
```

业务计划注册参数：

```yaml
yak:
  job:
    schedule:
      enabled: true
      initial-delay-millis: 2000
      fixed-delay-millis: 5000
      zone-id: Asia/Shanghai
```

生产环境可将 `spring.quartz.job-store-type` 调整为 `jdbc` 并配置 Quartz
集群表。
