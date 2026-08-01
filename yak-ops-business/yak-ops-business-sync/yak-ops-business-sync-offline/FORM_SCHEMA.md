# Yak Ops Connector Form Schema

第三阶段在第二阶段 Form Schema 之上补齐复杂交互、受控 Action 和前端动态渲染：

```text
Link-Up Connector Rule
          ↓ 归一化
Yak Ops Interaction Model
          ↓
Frontend Rule Engine + Backend Validation

Presentation Profile OptionSource
          ↓
Connector Form Action API
          ↓
Datasource Catalog
```

## 复杂交互

Form Schema 新增 `interactions`，把 Link-Up Rule 转换为稳定的跨语言效果：

- `VISIBLE`：条件成立时显示字段；
- `REQUIRED`：条件成立时必填；
- `DISABLED`：条件成立时只读；
- `EXCLUSIVE`：多个字段互斥；
- `BUNDLED`：字段同时填写或同时留空；
- `VALIDATE`：条件不成立时产生字段或表单错误。

条件支持链式 `AND / OR`，以及等于、不等于、包含、存在、布尔、数值比较、前后缀和正则等操作符。原始 `rules` 仍保留，`interactions` 只作为控制面稳定交互模型。

## 远程选项与级联

字段可声明：

```json
{
  "dependsOn": ["table_path"],
  "clearWhenHidden": true,
  "optionSource": {
    "action": "LIST_COLUMNS",
    "searchable": true,
    "multiple": true,
    "cacheTtlMillis": 30000,
    "requestValueKeys": ["table_path"]
  }
}
```

内置受控 Action：

- `LIST_TABLES`
- `LIST_COLUMNS`
- `PREVIEW`
- `COUNT`
- `SQL_TEMPLATE`
- `RESOLVE_SQL`

Action 只通过 Yak Ops 数据源 Catalog 执行，前端不直接连接数据库，也不直接访问 Link-Up Worker。

## API

```http
GET  /api/v1/job/batch-control/connectors/{connectorId}/form-schema?role=SOURCE
POST /api/v1/job/batch-control/connectors/{connectorId}/form-schema/validate?role=SOURCE
POST /api/v1/job/batch-control/connectors/actions/{action}
POST /api/v1/job/batch-control/connectors/schemas/refresh
```

## 前端

离线任务编辑页新增 Schema 驱动的 Connector 扩展配置：

- 分组、折叠和 Widget 动态渲染；
- 条件显示、条件必填、互斥和组合校验；
- 数据源 → 表 → 字段级联；
- 搜索防抖、请求竞态保护和短期缓存；
- 隐藏字段自动清理；
- 保存前执行后端在线校验；
- 缓存 Schema 使用状态明确提示。

当前单表主键字段也改为 Catalog 字段选择器；目标表自动创建时读取来源字段，写入已有表时读取目标字段。

## 兼容策略

动态表单值保存到 `connectorOptions`，同时同步现有 `table`、`sql`、`fetchSize`、`writeMode`、`primaryKey`、`batchSize` 等字段，因此本阶段不改变任务保存结构和 `LinkUpHoconBuilder`。

本阶段仍不包含 JSON JobSpec、HOCON 删除、CDC 或实时同步语义。
