# Yak Ops 数据开发运行结果面板（Phase One）

`/data-development/workbench` 底部运行结果面板展示当前资源的执行日志、状态和结果。Phase One 只支持 SQL 与 HTTP。

## 1. 交互目标

- SQL 点击“运行”，HTTP 点击“测试请求”后自动展开；
- 面板参与编辑区上下布局，不使用浮层覆盖编辑器；
- 支持拖动分隔条、展开、缩小、恢复和关闭；
- 每个资源独立保存运行历史和当前会话；
- 运行中默认展示输出，完成后切换到结果。

## 2. 结果映射

| Resource Type | Result Renderer |
| --- | --- |
| `SQL` | TableExecutionResultRenderer |
| `HTTP` | JsonExecutionResultRenderer |

前端通过 Registry 解析结果，不在 `ExecutionBottomPanel` 中写节点类型条件分支：

```ts
executionResultDefinitionRegistry.register('SQL', {
  resourceType: 'SQL',
  rendererKey: 'table-result',
});

executionResultDefinitionRegistry.register('HTTP', {
  resourceType: 'HTTP',
  rendererKey: 'json-result',
});
```

## 3. 执行会话

```ts
interface ExecutionSession {
  id: string;
  resourceId: string;
  resourceType: 'SQL' | 'HTTP';
  status: ExecutionStatus;
  submittedAt: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  logs: ExecutionLogEntry[];
  result?: ExecutionResultPayload;
  errorMessage?: string;
}
```

一次运行对应一个稳定执行会话。前端使用后端 `executionId`，通过 SSE 增量同步日志、状态和结果。

## 4. 后端接口

```text
POST /api/v1/data-development/tasks/{taskId}/executions
GET  /api/v1/data-development/executions/{executionId}/detail
GET  /api/v1/data-development/executions/{executionId}/events/stream
POST /api/v1/data-development/executions/{executionId}/cancel
```

后端持久化 Definition、Compiled Spec、Runtime 和 Input 快照，确保任务修改后仍能还原当次运行现场。

## 5. 当前边界

Terminal、Notebook、Pipeline 等旧节点结果不再注册。历史执行记录可继续由通用兼容层读取，但不能通过 Phase One Workbench 新建对应任务。
