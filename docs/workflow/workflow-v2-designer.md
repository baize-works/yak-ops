# Workflow V2 已发布任务拖拽设计器

## 目标

本阶段将新建工作流切换到 Workflow V2，并提供只消费已发布任务版本的可视化编排入口。

```text
Data Development
  -> publish immutable Task Version
  -> Published Task Library API
  -> drag task reference into Workflow V2 canvas
  -> save taskId + taskVersionId
```

设计器不再提供 HTTP、Shell、SQL、Python 或 Notebook 的任务配置表单。

## 路由兼容

统一入口仍然是：

```text
/workflow-management/:id/designer
```

入口页读取定义的 `schemaVersion` 后分流：

```text
schemaVersion=1 -> /workflow-management/v1/:id/designer
schemaVersion=2 -> /workflow-management/v2/:id/designer
create          -> /workflow-management/v2/create/designer
```

因此历史 V1 工作流继续使用原设计器，新建工作流默认采用 V2。没有隐式迁移或格式转换。

## 页面布局

Workflow V2 设计器采用：

```text
52px header
300px published task library | React Flow canvas
```

左侧资源库支持：

- 关键字搜索；
- 任务类型筛选；
- 全部、收藏、最近使用切换；
- 双击快速插入；
- 原生 HTML5 拖拽到画布；
- 显示项目、任务类型和发布版本号。

接口一次最多加载 100 条。结果超过 100 条时提示继续使用搜索或类型筛选缩小范围。

## 拖拽契约

拖拽 MIME：

```text
application/x-yak-workflow-published-task
```

拖入画布后只创建：

```json
{
  "kind": "TASK",
  "taskRef": {
    "taskId": "1001",
    "taskVersionId": "2003",
    "taskVersionNumber": 3,
    "taskType": "HTTP"
  }
}
```

不会复制：

```text
config
definition
compiledSpec
runtime
secret
HTTP/Shell/SQL plugin parameters
```

任务名称、项目名称、输入输出 Schema 等只作为前端展示元数据，不会被写入 Workflow V2 的任务内容。

## 节点和连线

画布包含三类节点：

- START：只有 SUCCESS 出口；
- TASK：一个输入、SUCCESS 出口和 FAILURE 出口；
- END：只有输入。

React Flow 的 `sourceHandle` 被映射为 Workflow V2 `fromPort`：

```text
SUCCESS -> fromPort=SUCCESS
FAILURE -> fromPort=FAILURE
```

开始和结束节点不能被删除。任务节点删除时会同步删除关联连线。

## 保存与发布

保存使用：

```http
PUT /api/v1/workflows/{workflowId}/draft/v2
```

发布使用：

```http
POST /api/v1/workflows/{workflowId}/publish
```

保存过程只序列化 Workflow V2 编排字段。发布继续由后端验证不可变任务版本、任务类型、版本号和必填输入绑定。

## 当前边界

本阶段不实现：

- 任务版本升级选择；
- 输入输出映射编辑器；
- 节点重试、超时和失败策略面板；
- V2 运行；
- V1 到 V2 自动迁移。

这些能力由后续编排面板、输入映射和统一 Task Execution Gateway 阶段实现。
