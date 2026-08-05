# yak-ops-business-job

Yak Ops 的离线同步调度聚合模块。时间触发统一委托给 Yak Framework
`yak-schedule`，业务模块只负责注册计划和处理触发请求。

## 目录约定

```text
io.yak.ops.business.job.schedule
├── JobScheduleRegistrar
├── JobScheduleRegistrationCoordinator
├── JobScheduleConfiguration
└── offline
    ├── OfflineSyncScheduleRegistrar
    ├── OfflineSyncScheduleHandler
    └── OfflineSyncScheduleConstants
```

不要把业务状态机、Worker 选择或业务失败重试放进调度模块。

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
