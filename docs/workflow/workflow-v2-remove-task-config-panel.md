# Workflow V2 删除节点任务配置 Panel

## 目标

Workflow V2 只负责任务版本引用和编排，不负责任务内部配置。

本阶段删除 V2 设计器中选中任务节点后出现在画布右上角的浮动 Panel，避免用户误以为可以在工作流中编辑 HTTP、Shell、SQL、Python 或 Notebook 等任务定义。

## 交互变化

调整前：

```text
点击 TASK 节点
  -> 选中节点
  -> 画布右上角显示任务节点浮层
  -> 浮层展示任务类型、版本和删除按钮
```

调整后：

```text
点击 TASK 节点
  -> 仅选中节点
  -> 不打开侧栏、抽屉、Popover 或任务配置 Panel
```

删除任务节点统一使用 React Flow 原生交互：

```text
选中 TASK
  -> Delete / Backspace
  -> 删除节点及关联连线
```

连线仍保留底部轻量删除工具条，因为它属于工作流编排关系，不属于任务配置。

## 删除保护

节点模型现在明确设置：

```text
START deletable=false
END   deletable=false
TASK  deletable=true
```

因此 React Flow 原生删除不会移除 START 和 END，也不再需要通过任务配置 Panel 承担删除保护。

## 职责边界

Workflow V2 页面不会提供或恢复以下任务配置入口：

```text
HTTP URL / Method / Header / Body
Shell Command / Args / Environment
SQL / Python / Notebook Source
Plugin-specific config
Definition / Compiled Spec
Runtime / Secret
```

任务节点仍可以展示任务名称、任务类型和固定发布版本号，但这些都是不可变引用的只读信息。

后续输入映射、输出映射、重试、超时和失败路由属于工作流编排能力，应通过独立的编排属性区域实现，不能复用旧任务配置 Panel。

## V1 兼容

本阶段仅删除 Workflow V2 的节点任务配置 Panel。

Workflow V1 设计器仍保留原 `NodePanel`，因为历史 V1 定义把插件配置直接存储在工作流 DAG 中。在 V1 到 V2 显式迁移工具完成前直接删除它，会导致历史工作流无法维护。

```text
Workflow V1 -> 兼容编辑，暂时保留旧 NodePanel
Workflow V2 -> 不允许任务配置 Panel
```

## 测试

模型测试覆盖：

- 新拖入 TASK 默认可删除；
- 从 V2 DAG 恢复时 TASK 可删除；
- START 和 END 不可删除；
- 删除能力不会进入 Workflow V2 持久化 JSON；
- taskRef 仍保持不可变任务版本引用。
