# Yak Ops Connector Form Schema

第二阶段在 Link-Up Connector Schema 之上增加产品展示层：

```text
Link-Up Connector Schema
          ↓ 缓存原始快照
ConnectorSchemaRegistry
          ↓ 合并
ConnectorPresentationRegistry + ConnectorFormSchemaComposer
          ↓
Yak Ops Form Schema
```

## API

```http
GET  /api/v1/job/batch-control/connectors/form-schemas?role=SOURCE
GET  /api/v1/job/batch-control/connectors/{connectorId}/form-schema?role=SOURCE
POST /api/v1/job/batch-control/connectors/schemas/refresh
```

Form Schema 保留 Link-Up 的类型、默认值、枚举值、必填、敏感、Scope、Semantic Type、规则和能力，同时补充：

- 分组和顺序；
- PRIMARY / COMMON / ADVANCED / EXPERT / HIDDEN 重要程度；
- widget、label、help、placeholder；
- hidden、readOnly、valueSource；
- Schema/Profile/Form 三层版本与指纹；
- REMOTE/CACHE 来源、同步时间和 stale 状态。

JDBC Source/Sink 已提供第一版专属 Profile。未知 Connector 会通过通用推导得到可用表单，不会因为缺少 Profile 而丢失参数。数据源连接参数默认隐藏并由数据源中心注入。

配置项：

```yaml
yak:
  sync:
    offline:
      schema:
        enabled: true
        refresh-enabled: true
        initial-delay-millis: 5000
        refresh-delay-millis: 300000
        max-stale-millis: 86400000
```

本阶段不包含前端动态渲染器、Connector Action API、JSON JobSpec 或 HOCON 替换。
