# Task 与 Workflow 职责分离及 Workflow V2 契约

## 1. 目标

Yak Ops 将任务开发与工作流编排拆成两个独立领域：

```text
Data Development Workbench
  -> Task Draft
  -> Immutable Task Version
  -> Compiled Spec

Workflow
  -> reference immutable Task Version
  -> bind inputs and outputs
  -> orchestrate success and failure routes
  -> control retry, timeout, pause and recovery
```

本阶段只建立职责边界和 Workflow V2 数据契约，不切换现有工作流持久化、设计器或执行引擎。

## 2. 当前问题

Workflow V1 节点同时保存了：

- HTTP、Shell 等插件专属配置；
- 节点重试、超时和失败处理；
- 画布位置与上下游关系；
- 插件身份和执行参数。

数据开发工作台已经具备任务草稿、校验、发布版本和执行快照后，继续在工作流节点中维护任务配置会形成两个编辑入口，并带来以下问题：

- 同一任务配置需要维护两份；
- TaskPlugin 同时服务任务开发和工作流 UI；
- 工作流无法稳定复现某次任务版本；
- 任务升级可能隐式改变已发布工作流；
- 重跑时难以确认使用的是哪一份任务定义。

## 3. 职责边界

### 3.1 Data Development / Task Authoring

负责“任务是什么”：

- 任务内容与插件专属配置；
- 草稿、乐观锁和校验；
- 测试运行；
- 不可变发布版本；
- Definition、Compiled Spec、Input Schema 和 Output Schema；
- 环境、参数模板和密钥引用。

任务内容的唯一编辑入口是数据开发工作台。

### 3.2 TaskPlugin

负责“任务如何被解释和执行”：

- 默认 Definition；
- Definition 标准化；
- Definition 校验；
- Compiled Spec 生成；
- 输入输出 Schema；
- 运行时执行与统一结果。

TaskPlugin 不负责：

- React Flow 节点和坐标；
- 工作流连线；
- 工作流节点 Panel；
- 上下游路由；
- 工作流失败策略和恢复策略。

### 3.3 Workflow

负责“任务如何被组织运行”：

- 引用不可变 Task Version；
- START、TASK、END 节点；
- 节点依赖关系；
- 输入输出映射；
- SUCCESS 和 FAILURE 路由；
- 节点级重试、超时和暂停策略；
- 工作流发布、实例、节点实例和恢复操作。

Workflow 不保存插件专属配置，不解释 HTTP、Shell、SQL 或其他任务内容。

## 4. 依赖方向

```text
workflow definition
  -> taskId + taskVersionId
  -> task version snapshot
  -> compiled spec
  -> task execution gateway
  -> task plugin / worker
```

允许的依赖：

```text
Workflow -> immutable Task Version contract
Workflow Runtime -> Task Execution Gateway
Task Execution Gateway -> TaskPlugin / Worker
```

禁止的依赖：

```text
Workflow UI -> HTTP/Shell/SQL configuration form
Workflow Definition -> plugin-specific config JSON
TaskPlugin -> React Flow node or workflow edge
Task Authoring -> workflow runtime state
```

## 5. Workflow V2 核心原则

### 5.1 版本固定

TASK 节点必须保存：

```text
taskId
taskVersionId
taskVersionNumber
taskType
```

`taskVersionId` 指向不可变发布版本。任务发布新版本后，现有工作流不会自动变化。工作流需要通过显式“升级版本”操作切换引用。

### 5.2 只保存编排信息

Workflow V2 节点不允许出现以下字段：

```text
config
compiledSpec
runtime secrets
HTTP URL / headers / body
Shell command / environment
SQL text
plugin-specific parameters
```

### 5.3 统一节点类型

第一版定义三类节点：

- `START`：声明工作流输入；
- `TASK`：引用一个不可变 Task Version；
- `END`：声明工作流输出。

后续条件、并行、子工作流等控制节点可以扩展 `kind`，但不能重新引入任务配置。

### 5.4 统一出口

连线通过 `fromPort` 声明来源结果：

- `SUCCESS`
- `FAILURE`

第一阶段中，超时和取消可由运行时统一映射到 FAILURE。未来如需暴露更多结果端口，应扩展端口枚举，而不是让 TaskPlugin 直接选择下游节点。

### 5.5 输入输出映射

绑定来源统一为：

- `START_INPUT`
- `NODE_OUTPUT`
- `WORKFLOW_VARIABLE`
- `LITERAL`

Workflow 只根据任务发布版本中的 Input Schema 和 Output Schema 校验映射，不读取任务编辑 Definition。

### 5.6 编排执行策略

`executionPolicy` 只保存编排层参数：

- `timeoutSeconds`
- `retryTimes`
- `retryIntervalSeconds`
- `failureAction`

`failureAction` 支持：

- `FAIL_WORKFLOW`
- `ROUTE_FAILURE`
- `PAUSE`

任务是否天然幂等、能否取消、结果类型等能力由 TaskPlugin 或 Task Version 声明，不在 Workflow 节点重复维护。

## 6. Workflow V2 示例

```json
{
  "schemaVersion": 2,
  "nodes": [
    {
      "key": "start",
      "name": "开始",
      "kind": "START",
      "positionX": 80,
      "positionY": 220,
      "enabled": true,
      "inputBindings": [],
      "outputBindings": {},
      "executionPolicy": {
        "timeoutSeconds": 0,
        "retryTimes": 0,
        "retryIntervalSeconds": 0,
        "failureAction": "FAIL_WORKFLOW"
      }
    },
    {
      "key": "query-order",
      "name": "查询订单",
      "kind": "TASK",
      "positionX": 380,
      "positionY": 220,
      "enabled": true,
      "taskRef": {
        "taskId": "1001",
        "taskVersionId": "2003",
        "taskVersionNumber": 3,
        "taskType": "HTTP"
      },
      "inputBindings": [
        {
          "target": "orderId",
          "source": {
            "type": "START_INPUT",
            "path": "$.orderId"
          }
        }
      ],
      "outputBindings": {},
      "executionPolicy": {
        "timeoutSeconds": 300,
        "retryTimes": 2,
        "retryIntervalSeconds": 10,
        "failureAction": "ROUTE_FAILURE"
      }
    },
    {
      "key": "end",
      "name": "结束",
      "kind": "END",
      "positionX": 700,
      "positionY": 220,
      "enabled": true,
      "inputBindings": [],
      "outputBindings": {
        "order": {
          "type": "NODE_OUTPUT",
          "nodeKey": "query-order",
          "path": "$.data"
        }
      },
      "executionPolicy": {
        "timeoutSeconds": 0,
        "retryTimes": 0,
        "retryIntervalSeconds": 0,
        "failureAction": "FAIL_WORKFLOW"
      }
    }
  ],
  "edges": [
    {
      "from": "start",
      "fromPort": "SUCCESS",
      "to": "query-order"
    },
    {
      "from": "query-order",
      "fromPort": "SUCCESS",
      "to": "end"
    }
  ],
  "viewport": {
    "x": 0,
    "y": 0,
    "zoom": 1
  }
}
```

规范化 JSON Schema 位于：

```text
docs/workflow/workflow-v2.schema.json
```

前后端类型镜像位于：

```text
yak-ops-common/.../workflow/v2/
yak-ops-ui/src/pages/workflow-management/workflow-v2.types.ts
```

## 7. 必须满足的契约约束

后续 V2 校验器必须保证：

1. `schemaVersion == 2`；
2. 节点 `key` 唯一；
3. 至少存在一个 START 和一个 END；
4. TASK 节点必须包含完整 `taskRef`；
5. START 和 END 不得包含 `taskRef`；
6. TASK 节点只能引用已发布、不可变的 Task Version；
7. 工作流定义不得包含插件专属配置；
8. Edge 的来源和目标节点必须存在；
9. START 只能使用 SUCCESS 出口；
10. FAILURE 出口只能从可执行节点产生；
11. NODE_OUTPUT 只能引用拓扑上的上游节点；
12. 必填任务输入必须完成绑定；
13. `ROUTE_FAILURE` 必须存在 FAILURE 连线；
14. 发布工作流时固化所有 Task Version 引用。

本阶段只定义这些约束，实际校验和持久化切换在后续步骤实现。

## 8. V1 兼容策略

过渡期采用：

```text
V1 Reader
V2 Reader
V2 Writer（后续启用）
```

规则：

- 当前 V1 持久化和执行逻辑保持不变；
- 新增 V2 类型不会自动迁移旧数据；
- 旧工作流继续按 V1 读取和运行；
- 后续设计器切换后，新建工作流使用 V2；
- 旧 HTTP/Shell 节点不能自动映射到某个真实 Task，应通过显式迁移向导选择任务；
- 工作流发布版本和运行实例始终保留当时的完整 DAG 快照。

## 9. 本阶段非目标

本阶段不实现：

- 工作流数据库迁移；
- V2 API；
- 左侧任务资源列表；
- 任务拖拽；
- Node Panel 重构；
- 输入映射 UI；
- V2 DAG 编译和执行；
- SUCCESS / FAILURE 运行路由；
- 节点重跑、暂停和恢复；
- V1 自动迁移。

## 10. 后续实施顺序

1. 提供工作流任务资源查询接口；
2. 增加 Workflow V2 持久化 Reader/Writer；
3. 重构设计器为任务资源拖拽布局；
4. 将节点配置 Panel 替换为编排 Panel；
5. 实现输入输出映射；
6. 通过统一 Task Execution Gateway 执行 Task Version；
7. 实现 SUCCESS / FAILURE 路由；
8. 实现重试、恢复和人工操作；
9. 清理 Workflow V1 内嵌任务配置。
