# Yak Ops Offline Sync

离线同步一期只承担三件事：任务配置、Link-Up 执行代理、执行历史。

```text
Yak Ops -> GET /api/v1/node
Yak Ops -> POST /api/v1/jobs
Yak Ops -> GET /api/v1/jobs/{jobId}
Yak Ops -> DELETE /api/v1/jobs/{jobId}
```

Link-Up 地址统一来自：

```yaml
yak:
  sync:
    offline:
      engine:
        base-url: http://127.0.0.1:18080
```

不再提供客户端管理、Connector 管理、多 Worker 调度、能力匹配、Preflight、动态注册和告警投递。

## 数据表

仅保留：

- `yak_offline_job_definition`
- `yak_offline_job_execution`
- `yak_offline_execution_event`

调度配置直接保存在任务定义表。每次执行保存任务定义和 JobSpec 快照，不再维护独立任务版本表。

## 数据库重建

本阶段明确不兼容旧离线同步表。Flyway 使用新的 `yak_offline_core_schema_history`，V1 会删除旧离线同步业务表和旧 `yak_offline_schema_history` 后重新建表。部署前应确认历史离线同步数据无需保留。
