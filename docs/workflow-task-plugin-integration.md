# Workflow 与 Task Plugin 集成设计

## 设计目标

Yak Ops 借鉴 DolphinScheduler 的任务插件职责拆分，但保持当前单进程工作流引擎的轻量定位，不引入 Master、Worker 或注册中心。

对应关系：

| DolphinScheduler | Yak Ops | 职责 |
| --- | --- | --- |
| `TaskChannelFactory` | `WorkflowTaskPluginFactory` | 插件身份、元数据、配置校验和执行器创建 |
| `TaskChannel` | `WorkflowTaskExecutorRegistry` | 插件发现、类型唯一性和运行时路由 |
| `AbstractTask` | `WorkflowTaskExecutor` | 一次物理 Attempt 的执行与取消 |
| `AbstractParameters` | 插件 `configurationSchema` 与 `validate` | 参数结构描述和发布期校验 |
| `TaskExecutionContext` | `WorkflowTaskContext` | 工作流实例、任务实例、Attempt、参数、日志和取消信号 |

## 生命周期

```text
应用启动
  -> ServiceLoader 发现 WorkflowTaskPluginFactory
  -> WorkflowTaskExecutorRegistry 建立插件目录

设计器打开
  -> GET /api/v1/workflows/task-plugins
  -> 节点选择器合并后端插件目录
  -> 未提供专属表单的插件使用通用 JSON 配置

保存草稿
  -> 保存 taskType + config

发布工作流
  -> WorkflowDagCompiler 校验 DAG
  -> WorkflowTaskExecutorRegistry.validate(taskType, config)
  -> 插件执行静态参数校验

运行工作流
  -> 每个物理 Attempt 调用 factory.create()
  -> 创建独立 WorkflowTaskExecutor
  -> 注入 WorkflowTaskContext
  -> 执行、日志、取消、超时、重试和结果落库
```

## 参数命名空间

任务插件统一从 `WorkflowTaskContext.parameters()` 读取参数：

```text
${name}                       兼容原有全局参数
${global.name}                显式全局参数
${system.workflowInstanceId}  工作流实例 ID
${system.taskInstanceId}      任务实例 ID
${system.attemptId}           物理尝试 ID
${system.attemptNo}           当前尝试次数
${system.nodeKey}             节点编码
${system.taskType}            插件类型
```

## 插件扩展步骤

1. 新建独立 Maven 模块，例如 `yak-ops-plugin-task-python`。
2. 实现 `WorkflowTaskExecutor`，负责单次 Attempt 的执行和取消。
3. 实现 `WorkflowTaskPluginFactory`，提供描述信息、配置 Schema 和执行器创建。
4. 在 `META-INF/services/io.yak.ops.spi.workflow.WorkflowTaskPluginFactory` 声明 Factory。
5. 将模块加入 `yak-ops-plugin-task-all`。
6. 增加参数校验、执行、取消和 ServiceLoader 发现测试。

工作流业务模块不得直接依赖具体任务插件。Boot 通过 `task-all` 完成最终装配。
