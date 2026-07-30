# Yak Ops Offline Sync

该模块负责 Yak Ops 离线同步任务的完整后端闭环：

- 持久化单表、多表和脚本模式任务定义；
- 保存前端可编辑 JSON，同时生成可提交给 Link-Up 的 HOCON；
- 对外提供任务分页、详情、上线、下线、删除、运行、停止和实例查询接口；
- 通过 Link-Up REST API 提交 Source → Sink 作业，并同步作业状态与指标；
- 保留历史 `/api/v1/executor` 和日志查询路径，兼容现有前端页面。

## 配置

```yaml
yak:
  sync:
    offline:
      enabled: true
      engine:
        enabled: true
        base-url: http://127.0.0.1:18080
        connect-timeout: 10s
        request-timeout: 30s
      datasource:
        url: jdbc:mariadb://127.0.0.1:3306/yak_security
        username: root
        password: 123456
```

前端只调用 Yak Ops 接口，不直接保存或暴露 Link-Up 服务地址。执行时，后端读取数据源模块中的连接参数，生成 Link-Up JDBC Source/Sink HOCON 后提交到 `POST /api/v1/jobs`。
