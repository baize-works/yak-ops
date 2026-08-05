# Workflow V2 输入输出映射

## 目标

Workflow V2 只保存任务版本引用与编排关系。本阶段补齐编排层输入输出映射，不恢复 HTTP、Shell、SQL、Python、Notebook 等任务内部配置。

```text
Published Task Version
  -> Input Schema / Output Schema
  -> Workflow mapping panel
  -> WorkflowV2 inputBindings / outputBindings
```

## Schema 回填

拖入任务时，资源库响应已经包含任务版本 Input/Output Schema。

工作流草稿重新打开后，DAG 中只保留不可变任务引用，因此设计器会按固定版本调用：

```http
GET /api/v1/data-development/tasks/library/{taskId}/versions/{versionId}
```

并回填项目、插件版本、发布时间以及 Input/Output Schema。

Schema 请求以 `taskId + versionId` 缓存。回填结果只用于前端映射展示，不会写入 Workflow V2 DAG，也不会因为打开草稿而产生未保存状态。

## TASK 输入映射

点击 TASK 节点后，右侧显示“输入映射”编排面板。

Input Schema 的根级 `properties` 作为任务输入目标，根级 `required` 用于标记必填字段。

每个输入支持以下来源：

```text
START_INPUT       开始输入路径
NODE_OUTPUT       拓扑上游任务输出
WORKFLOW_VARIABLE 工作流变量
LITERAL           固定值
```

持久化示例：

```json
{
  "target": "orderId",
  "source": {
    "type": "START_INPUT",
    "path": "orderId"
  }
}
```

对于没有声明 JSON Schema 的任务，可以添加自定义输入目标。

## 上游输出约束

`NODE_OUTPUT` 只能选择当前节点的拓扑祖先节点。

```text
START -> Task A -> Task B
```

Task B 可以引用 Task A，不能引用下游节点或没有依赖关系的旁路节点。

任务 Output Schema 会被展开为可选路径，例如：

```text
data
data.id
data.status
```

也允许手工填写路径，以兼容动态输出结构。

## END 工作流输出

点击 END 节点后，右侧显示“工作流输出”面板。

每个工作流输出由稳定名称和来源组成：

```json
{
  "order": {
    "type": "NODE_OUTPUT",
    "nodeKey": "task_query_order",
    "path": "data"
  }
}
```

输出来源同样支持开始输入、上游任务输出、工作流变量和固定值。

## 保存与发布

映射模型支持检查：

- 输入目标不能为空或重复；
- 开始输入路径不能为空；
- 工作流变量名不能为空；
- 上游输出必须包含节点和路径；
- NODE_OUTPUT 必须仍然是拓扑上游；
- 工作流输出名称不能为空；
- 已启用任务的 required 输入是否全部映射。

草稿允许逐步补充必填输入。发布仍由后端 `WorkflowV2DagValidator` 与 `WorkflowV2PublicationValidator` 承担最终可信校验。

## 节点展示

TASK 节点卡片展示：

```text
已映射输入数 / 声明输入数
Schema 加载状态
必填映射是否完整
```

END 节点卡片展示工作流输出数量。

## 职责边界

映射面板只编辑：

```text
inputBindings
outputBindings
```

不会编辑或持久化：

```text
Task config
Definition / Definition Snapshot
Compiled Spec
Runtime / Secret
HTTP / Shell / SQL / Python / Notebook 专属参数
```

## 当前边界

本阶段没有定义 START 节点输入 Schema 管理页面，`START_INPUT.path` 采用自由路径输入。

工作流变量来源已经支持，但变量声明与密钥管理仍由后续独立的工作流变量能力完成。
