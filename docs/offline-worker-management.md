# Link-Up 离线 Worker 管理

## 定位

Yak Ops 是离线同步控制面，Link-Up Server 是可独立部署的离线执行 Worker。

第一阶段只完成 Worker 管理闭环：

- 手工注册 Link-Up Worker
- 自动登记 `application.yml` 中的默认 Worker
- 连接验证与节点身份校验
- 定时心跳与手工刷新
- 版本、进程实例、并发、队列和负载展示
- 启用、排空、禁用和删除管理
- 为后续手动选择和自动分配保留权重、标签和 options 接口

本阶段不启用多 Worker 自动调度。离线任务仍使用：

```yaml
yak:
  sync:
    offline:
      engine:
        node-id: link-up-node-1
        base-url: http://127.0.0.1:18080
```

指定的默认 Worker。

## Worker 状态

健康状态：

- `UP`：Yak Ops 可以访问 `/api/v1/node`
- `DOWN`：最近一次心跳失败

调度状态：

- `ENABLED`：允许接收新任务
- `DRAINING`：不接收新任务，保留正在运行的任务
- `DISABLED`：不接收新任务，也不再执行定时心跳

默认配置 Worker 的登记来源是 `CONFIG`，不能在页面删除或修改地址；手工节点来源是 `MANUAL`。

## API

基础路径：

```text
/api/v1/offline/workers
```

接口：

```http
POST   /verify
POST   /
PUT    /{nodeId}
GET    /{nodeId}
POST   /page
GET    /options
POST   /{nodeId}/refresh
PUT    /{nodeId}/scheduling-status
DELETE /{nodeId}
```

新增和编辑会先请求目标 Link-Up：

```http
GET /api/v1/node
```

只有返回稳定 `nodeId` 且 `offlineOnly=true` 的节点才能登记。

## 数据模型

Worker 继续复用 `yak_offline_engine_node`，Flyway V6 增加：

- `registration_mode`
- `enabled`
- `scheduling_status`
- `weight`
- `labels_json`
- `started_at_millis`
- `offline_only`
- `last_success_time`
- `consecutive_failures`

运行状态和容量由心跳更新；节点名称、权重、标签和调度状态由 Yak Ops 管理。

## 下一阶段

第二阶段再实现：

- 任务定义的 `AUTO` / `MANUAL` Worker 选择
- Link-Up 客户端按执行节点地址路由
- 自动过滤不可用、排空、队列已满和能力不匹配的 Worker
- 按负载、权重和标签自动分配
- 执行实例固化 Worker 地址和分配原因
