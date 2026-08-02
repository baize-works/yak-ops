# Link-Up 离线 Worker 管理与调度

## 定位

Yak Ops 是离线同步控制面，Link-Up Server 是可独立部署的离线执行 Worker。

Worker 管理负责：

- 手工注册 Link-Up Worker
- 自动登记 `application.yml` 中的默认 Worker
- 连接验证与节点身份校验
- 定时心跳与手工刷新
- 版本、进程实例、并发、队列和负载展示
- 启用、排空、禁用和删除管理

多 Worker 调度负责：

- 为任务配置 `AUTO` 或 `MANUAL` Worker 策略
- 根据标签、健康状态、心跳、容量、负载和权重选择 Worker
- 将 Worker 地址、进程实例和分配依据固化到执行实例
- 后续提交、取消、指标查询和状态对账始终访问该执行实例的 Worker

## Worker 状态

健康状态：

- `UP`：Yak Ops 可以访问 `/api/v1/node`
- `DOWN`：最近一次心跳失败

调度状态：

- `ENABLED`：允许接收新任务
- `DRAINING`：不接收新任务，保留正在运行的任务
- `DISABLED`：不接收新任务，也不再执行定时心跳

默认配置 Worker 的登记来源是 `CONFIG`，不能在页面删除或修改地址；手工节点来源是 `MANUAL`。

## Worker 管理 API

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

新增和编辑地址会请求目标 Link-Up：

```http
GET /api/v1/node
```

只有返回稳定 `nodeId` 且 `offlineOnly=true` 的节点才能登记。

## 任务调度策略

任务定义中保存：

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

手动指定节点：

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
- `MANUAL`：严格使用指定 `nodeId`；节点不可用时直接失败，不自动切换。
- 标签采用精确匹配，手动和自动模式都会校验。
- 已经创建的执行实例不会因为任务策略或 Worker 地址后来发生变化而漂移。
- 手动任务通过数据库外键引用 Worker，仍被任务定义引用的节点不能删除。

## 自动调度算法

### 硬过滤

候选节点必须同时满足：

1. `enabled=true`
2. `scheduling_status=ENABLED`
3. `status=UP`
4. `offline_only=true`
5. 心跳未过期
6. 满足任务要求的全部标签
7. 运行并发和等待队列没有同时满载

`DRAINING` 节点不会接收新任务，但原有执行仍继续在该节点对账和取消。

### 有效负载

Worker 心跳存在刷新间隔。为了避免多个任务并发提交时同时读取旧负载，执行领取事务会：

1. 锁定当前任务定义，防止同一任务重复运行。
2. 按 `nodeId` 固定顺序对全部 Worker 行执行 `SELECT ... FOR UPDATE`。
3. 聚合 Yak Ops 数据库中 `CREATED / SUBMITTED / QUEUED / RUNNING` 的执行数。
4. 将控制面活跃执行数与 Worker 上报的运行、排队数量取保守值。
5. 选择 Worker 并在同一事务内插入执行实例，然后释放锁。

因此，不同任务即使并发提交，也不会全部基于同一份旧心跳选择同一个 Worker。

### 评分

通过硬过滤后计算：

```text
score = runningHeadroom × 55
      + totalCapacityHeadroom × 35
      + normalizedWeight × 10
```

其中：

- `runningHeadroom`：有效运行并发余量比例
- `totalCapacityHeadroom`：有效运行并发与等待队列的综合余量比例
- `normalizedWeight`：管理权重归一化结果，权重范围为 `1..1000`

同分时依次比较：

1. 有效排队任务更少
2. 有效运行任务更少
3. 权重更高
4. `nodeId` 字典序

调度结果会记录：

- 分配模式
- 最终得分
- 选择原因
- Worker 上报负载
- 控制面活跃执行数
- 计算后的有效负载
- 所有候选节点及淘汰原因

## 执行路由与可靠性

执行实例固化：

- `engine_node_id`
- `engine_node_base_url`
- `worker_instance_id`
- `assignment_mode`
- `assignment_score`
- `assignment_reason`
- `assignment_candidates_json`

所有远程操作均使用执行实例固化的 `engine_node_base_url`：

- 提交 JobSpec
- 根据 `jobId` 或 `externalExecutionId` 对账
- 取消任务
- 查询 pipeline、task 和 metrics

当提交发生不确定网络错误时，Yak Ops 不会立即切换到其他 Worker，因为原 Worker 可能已经接收幂等请求；控制面会继续在原 Worker 上按 `externalExecutionId` 对账。

Worker 进程实例发生变化且原执行仍未结束时，控制面将该执行标记为 `LOST`。后续重试会创建新的执行实例并重新执行 Worker 调度。

## 数据模型

Worker 管理继续复用 `yak_offline_engine_node`。

Flyway V7 为任务定义增加：

- `worker_select_mode`
- `worker_node_id`
- `worker_required_labels_json`
- `worker_node_id -> yak_offline_engine_node.node_id` 外键

为执行实例增加：

- `engine_node_base_url`
- `assignment_mode`
- `assignment_score`
- `assignment_reason`
- `assignment_candidates_json`

历史任务默认迁移为 `AUTO`。历史执行没有 `engine_node_base_url` 时，继续兼容原默认 Worker 配置。

## 当前边界

本阶段完成离线任务的多 Worker 调度，不引入：

- CDC 或流式任务调度
- 跨 Worker 迁移正在运行的任务
- 提交不确定时的自动故障转移
- Worker 侧资源预占或分布式容量租约
- 基于 Connector 能力清单的调度约束

后续可以在现有调度器上增加 Connector 能力、租户配额、Worker 侧资源租约和更细粒度的调度审计。
