# Yak Ops 数据开发运行结果面板

本文档描述 `/data-development/workbench` 底部运行结果面板的前端架构。该面板参考 DataWorks Data Studio 的上下分区交互，但保持 Yak Ops Workbench Kernel 的插件化设计。

## 1. 交互目标

- 点击节点工具栏中的“运行”“测试请求”或“运行全部”后，底部面板自动展开。
- 面板作为编辑区的下半部分参与布局，不使用浮层覆盖代码编辑器。
- 用户可以拖动顶部横向分隔条调整面板高度，也可以展开、缩小、恢复默认高度或关闭面板。
- 切换工作台标签时，底部面板显示当前资源自己的运行历史和最近一次运行结果。
- 运行中默认进入“输出”页，运行完成后自动切换到“结果”页。

## 2. 公共区域与节点差异

所有节点共享以下能力：

- 问题
- 输出日志
- 数据血缘占位
- 运行结果
- 发布状态
- 深度检查
- 质量测试占位
- 执行 ID、开始时间、结束时间、耗时和运行状态
- 当前节点运行历史

“结果”页由节点类型决定渲染方式：

| 节点类型 | Result Renderer |
| --- | --- |
| SQL / Flink SQL | 表格结果 |
| HTTP | JSON 响应、状态码和响应头 |
| Shell / Python | Terminal 输出和退出码 |
| Notebook | Cell 执行结果 |
| 数据集成 | 吞吐、行数和阶段状态 |
| 资源文件及未知类型 | 文本兜底 |

## 3. 目录结构

```text
workbench/
├── execution/
│   ├── bootstrap.ts
│   ├── definitions.ts
│   ├── mock-results.ts
│   ├── registry.ts
│   ├── types.ts
│   ├── components/
│   │   ├── ExecutionBottomPanel.tsx
│   │   └── ExecutionPanelResizeHandle.tsx
│   ├── renderers/
│   │   ├── TableExecutionResultRenderer.tsx
│   │   ├── JsonExecutionResultRenderer.tsx
│   │   ├── TerminalExecutionResultRenderer.tsx
│   │   ├── NotebookExecutionResultRenderer.tsx
│   │   ├── PipelineExecutionResultRenderer.tsx
│   │   └── TextExecutionResultRenderer.tsx
│   └── store/
│       └── execution-panel.store.ts
```

执行面板状态和工作台资源状态分开保存。编辑一个字符不会导致运行日志、历史结果和面板尺寸跟随文档 Store 高频更新。

## 4. 执行会话模型

```ts
interface ExecutionSession {
  id: string;
  resourceId: string;
  resourceType: string;
  resourceName: string;
  engine: string;
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

一次运行对应一个不可变的执行会话。后续接入后端时，前端应使用后端返回的 `executionId`，并通过 SSE 或 WebSocket 增量写入日志、状态和结果事件。

## 5. Result Registry

节点类型不直接出现在 `ExecutionBottomPanel` 的条件分支里，而是先解析结果定义：

```ts
executionResultDefinitionRegistry.register('HTTP', {
  resourceType: 'HTTP',
  rendererKey: 'json-result',
});
```

再由 Renderer Registry 获取组件：

```ts
executionResultRendererRegistry.register(
  'json-result',
  JsonExecutionResultRenderer,
);
```

新增节点结果类型时，只需要注册新的 definition 和 renderer，不需要修改底部面板外壳。

## 6. 后端接入建议

推荐运行接口：

```http
POST /api/data-development/resources/{resourceId}/executions
```

返回：

```json
{
  "executionId": "RUN-20260804-0001",
  "status": "QUEUED"
}
```

事件流：

```text
execution.queued
execution.running
execution.log
execution.progress
execution.result
execution.completed
execution.failed
```

不同节点的 `execution.result` 可以拥有不同 payload，但必须包含：

```json
{
  "schemaVersion": 1,
  "resourceType": "HTTP",
  "resultKind": "json",
  "payload": {}
}
```

前端根据 `resourceType` 和 Result Registry 选择 Renderer。后端保存原始执行快照，避免资源内容修改后无法还原当次运行现场。

## 7. 当前范围

本次先落地布局、拖拽、会话状态、公共标签页和各类 Mock Result Renderer。真实日志流、分页结果集、超大 JSON 虚拟滚动、结果导出、血缘图、发布流程和质量测试将在后续接口阶段继续完善。
