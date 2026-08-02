# Link-Up Worker 数据源可达性调度

## 目标

能力调度只能证明 Worker 安装了正确 Connector，并不能证明该 Worker 所在网络能够连接具体 Source 和 Sink。

Yak Ops 因此在任务领取事务之前调用 Link-Up Connector 安全预检，从实际候选 Worker 视角验证外部系统可达性。

配套 Link-Up PR 提供：

```http
POST /api/v1/connectors/{connectorId}/preflight?role=SOURCE|SINK
```

## 运行流程

```text
执行命令
  ↓
刷新到期 Worker Connector 能力
  ↓
解析当前任务版本 JobSpec 和最新数据源凭据
  ↓
从候选 Worker 依次执行 Source/Sink 只读 preflight
  ↓
仅持久化 options SHA-256、状态、耗时和脱敏错误
  ↓
进入数据库事务并锁定 Worker 行
  ↓
按能力、可达性、标签、健康、容量和权重选择 Worker
  ↓
创建执行实例并固化全部调度证据
```

远程调用不会发生在任务定义锁或 Worker 行锁内部。

## 缓存键

```text
nodeId + connectorId + role + optionsDigest
```

`optionsDigest` 是 Connector 实际运行 options 的规范化 SHA-256，包含连接参数变化的影响，但数据库不保存 options 或凭据明文。

因此：

- 数据源地址、用户名、密码或额外连接参数变化后，不会复用旧预检。
- 同一任务短时间批量触发时，可以复用相同结果，避免数据库探测风暴。
- 不同 Worker 的结果完全隔离。

## 状态

- `REACHABLE`：Worker 预检成功
- `UNREACHABLE`：连接失败、超时或配置错误
- `UNSUPPORTED`：Worker 版本或 Connector 尚未实现安全 preflight
- `MISSING`：尚无缓存记录，仅在审计响应中使用

默认严格模式下，只有 Source 和 Sink 均为新鲜 `REACHABLE` 的 Worker 才能参与调度。

## 配置

```yaml
yak:
  sync:
    offline:
      capability:
        reachability-enabled: true
        reachability-required: true
        reachability-max-stale-millis: 60000
        reachability-max-workers: 50
        reachability-retention-millis: 86400000
```

升级 Link-Up Worker 期间可以临时使用：

```yaml
yak:
  sync:
    offline:
      capability:
        reachability-required: false
```

此时不可达或不支持结果不会成为硬过滤条件，但仍会写入候选审计。生产环境完成 Worker 升级后应恢复严格模式。

## 执行审计

执行实例新增：

- `reachability_requirements_json`
- `assigned_reachability_json`

查询：

```http
GET /api/v1/offline/executions/{executionId}/scheduling-evidence
```

响应包含：

- 任务能力要求
- Worker 实际能力匹配
- Source/Sink options 摘要
- Worker 视角预检状态、耗时和检查时间
- 所有候选 Worker 的能力、可达性和淘汰原因

## 安全边界

- Yak Ops 不持久化预检请求中的密码、Token 或完整 options。
- Link-Up 统一错误协议会对常见密码字段进行脱敏。
- JDBC preflight 只建立连接并调用 `Connection.isValid`，不执行 SQL。
- 运行中任务不会因为后续预检状态变化而迁移到其他 Worker。
- 提交结果不确定时仍只在原 Worker 上通过幂等标识对账。
