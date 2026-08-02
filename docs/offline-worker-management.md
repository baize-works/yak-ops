# Link-Up 离线 Worker 管理与能力调度

## 定位

Yak Ops 是离线同步控制面，Link-Up Server 是可独立部署、可横向扩容的离线执行 Worker。

当前已经形成三层闭环：

1. Worker 管理：注册、验证、心跳、容量、启停和排空。
2. 多 Worker 调度：`AUTO / MANUAL`、标签、容量、权重和执行路由固化。
3. 能力调度：逐 Worker Connector 能力快照、任务能力要求、Schema 指纹匹配和执行审计。

## Worker 状态

健康状态：

- `UP`：Yak Ops 可以访问 `/api/v1/node`
- `DOWN`：最近一次心跳失败

调度状态：

- `ENABLED`：允许接收新任务
- `DRAINING`：不接收新任务，保留正在运行的任务
- `DISABLED`：不接收新任务，也不再执行定时心跳

能力状态：

- `UNKNOWN`：尚未获取 Connector 能力
- `READY`：已经保存可用于调度的能力快照
- `ERROR`：最近一次同步失败；保留最后一次成功快照用于诊断，但不会参与严格能力调度

只有健康、调度、容量和能力条件均满足的 Worker 才会在页面和任务节点下拉中标记为可用。

## Worker 管理 API

基础路径：

```text
/api/v1/offline/workers
```

```http
POST   /verify
POST   /
PUT    /{nodeId}
GET    /{nodeId}
POST   /page
GET    /options
POST   /{nodeId}/refresh
GET    /{nodeId}/capabilities
POST   /{nodeId}/capabilities/refresh
PUT    /{nodeId}/scheduling-status
DELETE /{nodeId}
```

`POST /{nodeId}/refresh` 会同时刷新节点心跳和 Connector 能力；能力接口可单独查询或强制刷新能力快照。

## 任务调度策略

自动模式：

```json
{
  "worker": {
    "mode": "AUTO",
    "requiredLabels": {
      "region": "south-china",
      "storage": "ssd"
    }
  }
}
```

手动模式：

```json
{
  "worker": {
    "mode": "MANUAL",
    "nodeId": "link-up-south-01",
    "requiredLabels": {
      "region": "south-china"
    }
  }
}
```

规则：

- `AUTO`：每次新执行或重试重新评估当前 Worker 集合。
- `MANUAL`：严格使用指定 `nodeId`；节点不满足能力或运行条件时直接失败。
- 标签采用精确匹配，手动和自动模式都会校验。
- 已创建的执行实例不会因为任务策略、Worker 地址或能力后来发生变化而漂移。

## Connector 能力事实层

Yak Ops 使用 Link-Up 已有协议：

```http
GET /api/v1/connectors
GET /api/v1/connectors/{connectorId}/schema?role=SOURCE|SINK
```

每个 Worker 独立保存精简能力摘要：

```json
{
  "nodeId": "link-up-south-01",
  "workerInstanceId": "instance-xxx",
  "engineVersion": "1.0.0",
  "connectors": [
    {
      "connectorId": "jdbc",
      "role": "SOURCE",
      "schemaVersion": "1",
      "schemaFingerprint": "sha256:...",
      "implementationVersion": "1.0.0",
      "capabilities": [
        "CUSTOM_SQL",
        "MULTI_TABLE",
        "PARTITION_SPLIT"
      ]
    }
  ]
}
```

快照会进行规范化排序并生成 SHA-256 摘要。远程能力请求只发生在后台刷新、手工刷新或执行领取之前的预热阶段，不会发生在 Worker 行锁和任务领取事务内。

默认配置：

```yaml
yak:
  sync:
    offline:
      capability:
        enabled: true
        strict-schema-fingerprint: true
        max-stale-millis: 900000
        initial-delay-millis: 10000
        refresh-delay-millis: 60000
        worker-refresh-millis: 300000
```

## 任务能力要求

Yak Ops 从不可变 JobSpec 自动派生能力要求，无需用户重复配置。

固定要求：

- Source Connector 与 `SOURCE` 角色
- Sink Connector 与 `SINK` 角色
- 保存任务版本时使用的 Schema 版本和指纹

根据任务配置自动派生：

| JobSpec 配置 | 所需能力 |
|---|---|
| Source 自定义 SQL | `CUSTOM_SQL` |
| 多表同步 | `MULTI_TABLE` |
| 分片字段或分片数量 | `PARTITION_SPLIT` |
| Sink UPSERT | `UPSERT` |
| 自动建表 | `AUTO_CREATE_TABLE` |
| Sink 自定义 SQL | `CUSTOM_SQL` |
| 跳过脏数据或脏数据阈值 | `DIRTY_DATA_HANDLING` |

新任务版本在保存时固化能力要求。历史版本没有能力字段时，会在首次执行前从该版本的不可变 JobSpec 派生并回填，不修改 JobSpec、配置摘要或版本号。

## 能力匹配

调度器对每个候选 Worker 依次校验：

1. 存在所需 `connectorId + role`
2. 能力快照状态为 `READY`
3. 快照未超过 `max-stale-millis`
4. 严格模式下 Schema 指纹与任务版本一致
5. Worker 声明的能力集合包含任务要求的全部能力

能力不匹配属于硬过滤，不通过加权评分弥补。`MANUAL` 模式同样执行完整能力校验，不会偷偷切换到其他 Worker。

## 自动调度算法

候选节点还必须满足：

1. `enabled=true`
2. `scheduling_status=ENABLED`
3. `status=UP`
4. `offline_only=true`
5. 心跳未过期
6. 满足任务要求的全部标签
7. Connector 能力完全匹配
8. 运行并发和等待队列没有同时满载

通过硬过滤后计算：

```text
score = runningHeadroom × 55
      + totalCapacityHeadroom × 35
      + normalizedWeight × 10
```

执行领取事务按 `nodeId` 固定顺序锁定 Worker 行，并将数据库中的活跃执行数叠加到 Worker 心跳负载，避免并发提交基于同一份旧快照产生容量超卖。

## 执行路由与审计

执行实例固化：

- `engine_node_id`
- `engine_node_base_url`
- `worker_instance_id`
- `assignment_mode`
- `assignment_score`
- `assignment_reason`
- `assignment_candidates_json`
- `required_capabilities_json`
- `assigned_capabilities_json`

所有提交、取消、指标查询和后台对账都访问执行实例固化的 Worker 地址。

实例详情可以查看：

- 任务版本要求的 Connector、角色、Schema 指纹和执行能力
- 最终 Worker 实际匹配的能力摘要
- 所有候选 Worker 的能力状态、摘要、匹配结果和淘汰原因

当提交发生不确定网络错误时，不会自动切换 Worker，而是在原 Worker 上继续通过幂等标识对账。

## Flyway

V7 增加多 Worker 策略和执行分配字段。

V8 增加：

Worker：

- `capability_status`
- `capability_digest`
- `connector_schemas_json`
- `capability_synced_at`
- `capability_error_message`

任务定义与版本：

- `capability_requirements_json`

执行实例：

- `required_capabilities_json`
- `assigned_capabilities_json`

## 当前边界

本阶段完成基于 Link-Up Connector Schema 的能力调度，不包含：

- CDC 或流式任务调度
- 运行中任务跨 Worker 迁移
- 提交结果不确定时自动故障转移
- Worker 侧分布式资源租约
- Worker 侧真实数据源网络探测

数据中心、网络区域和专线隔离继续通过 Worker 标签约束。真正的 Worker 侧数据源可达性探测需要 Link-Up 提供安全的预检协议，不能使用 Yak Ops 自身网络连通结果代替 Worker 视角。
