# Link-Up Worker 动态注册

## 定位

第四阶段将 Worker 管理从“Yak Ops 预先知道每一个 Worker 地址”扩展为“Worker 启动后主动登记并续租”。

动态注册只负责 Worker 运行事实：

- Worker 地址、nodeId 与进程 instanceId
- 引擎版本、启动时间
- 运行并发、等待队列和当前负载
- Connector、角色、Schema 指纹与执行能力
- 租约到期时间和心跳序列

Yak Ops 始终拥有管理字段：

- 节点显示名称
- 标签
- 调度权重
- 启用、排空和禁用状态

Worker 心跳不会覆盖这些管理设置。

## 注册模式

| 模式 | 来源 | 健康与能力更新方式 |
|---|---|---|
| `CONFIG` | Yak Ops `application.yml` | Yak Ops 主动探测 |
| `MANUAL` | 管理页面手工登记 | Yak Ops 主动探测 |
| `DYNAMIC` | Link-Up Worker 主动注册 | Worker 签名心跳续租 |

相同 `nodeId` 不能在不同模式之间自动抢占。需要先删除或调整原节点，再切换注册模式。

## 安全协议

公开路径：

```http
POST /api/v1/offline/worker-registration/register
POST /api/v1/offline/worker-registration/heartbeat
POST /api/v1/offline/worker-registration/deregister
```

每个请求必须携带：

```text
X-Yak-Registration-Timestamp
X-Yak-Registration-Nonce
X-Yak-Registration-Signature
```

签名原文：

```text
HTTP_METHOD\n
REQUEST_URI\n
TIMESTAMP_MILLIS\n
NONCE\n
SHA256(RAW_JSON_BODY)
```

签名算法为 `HMAC-SHA256`。Yak Ops 还会校验时间偏差并将 nonce 摘要写入一次性防重放表。签名校验成功后才会消耗 nonce。

生产环境应同时使用 HTTPS；HMAC 用于请求身份和完整性，TLS 用于保护请求中的 Worker 元数据。

## Yak Ops 配置

动态注册默认关闭：

```yaml
yak:
  sync:
    offline:
      registration:
        enabled: true
        secret: ${YAK_OFFLINE_REGISTRATION_SECRET}
        auto-enable: true
        heartbeat-interval-millis: 20000
        lease-duration-millis: 90000
        clock-skew-millis: 300000
        nonce-retention-millis: 600000
```

环境变量示例：

```bash
export YAK_OFFLINE_REGISTRATION_ENABLED=true
export YAK_OFFLINE_REGISTRATION_SECRET='replace-with-at-least-16-random-characters'
```

建议使用不少于 32 字节的随机密钥，并通过 Secret 管理系统注入，不要提交到仓库。

## 租约语义

首次注册：

1. 校验签名、时间戳和 nonce。
2. 校验协议版本、nodeId、instanceId 和 Worker 地址。
3. 创建 `DYNAMIC` 节点和租约。
4. 根据 `auto-enable` 设置初始调度状态。
5. 保存 Worker 推送的 Connector 能力快照。

续租：

- `leaseId + nodeId + instanceId` 必须完全匹配。
- `sequence` 必须严格递增。
- 每次成功心跳延长租约。
- 管理名称、标签、权重和调度状态不被覆盖。

实例接管：

- 旧租约有效时，不同 `instanceId` 会收到 `409 Conflict`。
- 旧租约过期后，新实例可使用相同 nodeId 注册并获得新 leaseId。
- 同一实例的不确定网络重试会复用原 leaseId。

租约过期：

- 节点被标记为 `DOWN`，但不会自动删除。
- 调度器在能力过滤阶段再次直接检查租约时间，不依赖后台清理间隔。
- 管理员可在节点列表或详情页撤销租约。

## 管理接口

```http
POST /api/v1/offline/workers/{nodeId}/lease/revoke
```

请求示例：

```json
{
  "reason": "节点下线维护"
}
```

有效租约存在时不能直接删除动态节点，必须先撤销租约，避免把仍在运行的 Worker 误认为未登记节点。

## Flyway V9

V9 为 Worker 增加：

- `registration_lease_id`
- `registration_instance_id`
- `registration_protocol_version`
- `lease_expires_at`
- `last_registration_time`
- `heartbeat_sequence`

并新增：

- `yak_offline_worker_registration_nonce`：nonce 防重放
- `yak_offline_worker_registration_event`：注册、重试、接管、注销和撤销等低频生命周期审计；普通心跳只更新节点表，不写事件表

## 发布顺序

1. 先部署支持动态注册接口的 Yak Ops。
2. 配置共享密钥并启用 Yak Ops 动态注册。
3. 再滚动升级 Link-Up Worker，并配置相同共享密钥。
4. 确认节点显示为“动态注册 / 租约有效 / 能力就绪”。
5. 逐步删除不再需要的手工登记节点。

旧版 Worker 不受影响，仍可继续以 `CONFIG` 或 `MANUAL` 模式运行。
