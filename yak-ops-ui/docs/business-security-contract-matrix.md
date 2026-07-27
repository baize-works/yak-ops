# 业务模块 Security 权限接入矩阵（阶段门禁）

> 审计日期：2026-07-27；前端基线：`64d8eca`。
>
> 本文登记业务页面当前真正调用的接口，以及本仓库能够证明和不能证明的合同。它不是权限编码设计稿。
> **在取得固定版本的后端 Controller、DTO、权限注解和权限初始化 SQL 前，不得把候选编码写入按钮、
> 路由或菜单，也不得把“前端隐藏”登记为权限接入完成。**

## 1. 结论与统一门禁

当前工作区不含业务 API 或 yak-security 后端源码、OpenAPI、权限注解或权限初始化 SQL；访问
`yak-framework/yak-security` 也被环境的 HTTPS CONNECT 403 阻断。因此，下面 11 类业务已经全部
进入矩阵，但 **已核验权限编码集合仍为空**。`navigation.ts` 中现有的
`task:batch:*`、`resource:*`、`workflow:*`、`quality:*`、`operations:*` 字符串没有后端证据，均只能
视为待复核的前端历史配置，不能据此继续推导 edit/delete/run 等编码。

所有当前业务请求都经过 `HttpUtils`；是否携带 Session 取决于该公共封装和部署 Cookie。业务页面
没有注入 Security 项目 Header，也没有独立的工作流项目 Header 类型。后端必须逐接口确认 Session、
CSRF、项目 Header 的名字/值类型/必填范围；确认前不得把 Security 项目选择值复用成工作流项目 ID。

状态定义：

* **前端事实**：方法和路径可由当前源码直接证明；DTO 仅代表前端当前传值，不代表后端合同。
* **后端依赖**：缺少 Controller/DTO/注解/SQL，禁止绑定权限编码。
* **占位**：页面没有业务请求；只登记页面存在，不虚构接口或功能。

## 2. 11 类业务映射

| 类别 | 当前页面动作 | HTTP 方法与 `/api/v1/**` 路径 | 当前前端 DTO/返回 | Session / 项目 Header | 权限注解与接入状态 |
| --- | --- | --- | --- | --- | --- |
| data-source | 分页、详情、全部、创建、更新、删除 | `POST /data-source/page`; `GET /data-source/{id}`; `POST /data-source/all`; `POST /data-source`; `PUT /data-source/{id}`; `DELETE /data-source/{id}` | `DataSourcePageParams`, `DataSourcePageResult`, `DataSourceRecord`; 写入仍是 `Record<string, unknown>` | 未逐接口确认；无项目 Header | **后端依赖**；列表/详情及写按钮均不得新增编码 |
| data-source | 连通测试、选项、catalog 查询/预览 | `GET /data-source/{id}/connect-test`; `POST /data-source/connect-test-with-param`; `GET /data-source/option`; `GET/POST /data-source/catalog/**` | 多处为 `unknown`/`any` | 同上；上传还需确认 Cookie/CSRF | **后端依赖**；测试连接、SQL 解析和上传必须分别核验 |
| client | 保存、详情、删除、分页、选项、数据源验证、指标 | `POST /devops/client/saveOrUpdate`; `GET/DELETE /devops/client/{id}`; `POST /devops/client/page`; `GET /devops/client/option`; `POST /devops/client/{id}/verify-datasource`; `GET /devops/client/{id}/metrics` | `LinkupClient`, `LinkupClientPageRequest`; 分页返回仍为 `any` | 未确认；无项目 Header | **后端依赖**；saveOrUpdate 必须确认新增/编辑是否同一权限 |
| connector | 当前页面 | 无请求 | 无 DTO | 不适用 | **占位**；只可在后端存在查看注解时配置路由，不能声称 CRUD 已实现 |
| batch-link-up | 保存/更新三种模式、详情、编辑详情、唯一 ID、删除、上下线、分页、配置预览 | `POST /job/batch-definition/{script,guide-single,guide-multi}/saveOrUpdate`; `GET /job/batch-definition/{id}`; `GET /{id}/edit-detail`; `GET /get-unique-id`; `DELETE /{id}`; `PUT /{id}/{online,offline}`; `POST /page`; `POST /**/build-config` | `LinkupJobDefinition`; 大多数 body/返回为 `any` | 未确认；无项目 Header | **后端依赖**；快速创建须与保存端点的真实新增权限一致；上下线单独核验 |
| batch-link-up | 执行、暂停、实例、日志、调度、Copilot | `GET /executor/{execute,pause}`; `POST /job/batch-instance/page`; `GET /job/batch-instance/{id}` 及 `/log`, `/table-metrics`; `GET /job/schedule/{start-schedule,stop-schedule,last5-execution-times}`; `POST /copilot/ai/agent` | 多数为 `any` | 未确认；日志/长任务的 Session 失效语义待确认 | **后端依赖**；运行、暂停和调度是不同动作，不用 `read` 代替 |
| realtime-link-up | 当前页面 | 无请求 | 无 DTO | 不适用 | **占位**；不得从 batch 权限命名推导 realtime 编码 |
| workflow-project | 当前页面 | 无请求 | 无 DTO | 工作流项目类型尚不存在 | **占位**；严禁与 Security 授权项目 Header/类型混用 |
| workflow-management | 当前页面 | 无请求 | 无 DTO | 工作流项目 Header 未定义 | **占位**；设计器/详情路由没有接口证据，不绑定候选编码 |
| workflow-instance | 当前页面 | 无请求 | 无 DTO | 工作流项目 Header 未定义 | **占位**；运行类动作尚不存在 |
| data-quality | 当前页面 | 无请求 | 无 DTO | 不适用 | **占位**；alarm 引用的 quality-points 不能反证质量规则页权限 |
| metrics | 汇总、图表 | `GET /job/metrics/summary`; `GET /job/metrics/charts` | `TimeRange`, `TaskType`; 返回未声明 DTO | 未确认；无项目 Header | **后端依赖**；仅可在两个 GET 的查看注解确认后保护菜单/路由 |
| alarm | 通道类型/列表/保存/删除/测试 | `GET /alarm/channel-types`; `GET /alarm/channels`; `POST /alarm/channels`; `DELETE /alarm/channels/{id}`; `POST /alarm/channels/test` | `AlarmChannelCommand`, `AlarmChannelRecord`, `ChannelTypeVO` | 未确认；无项目 Header | **后端依赖**；保存合并新增/编辑，需确认注解语义 |
| alarm | 规则、关联、记录 | `GET /alarm/rules`; `POST /alarm/rules`; `DELETE /alarm/rules/{id}`; `GET /alarm/rules/{id}/channels`; `GET /alarm/rules/all-channels`; `GET /alarm/records` | `AlarmRuleCommand`, `AlarmRuleRecord`, `AlarmRecordQuery/Page` | 未确认；无项目 Header | **后端依赖**；批量关联读取及删除分别核验 |
| alarm | 质量点辅助数据 | `GET/POST/PUT/DELETE /quality-points/**`; `GET /segment-dicts` | 多处本地类型/`any` | 未确认；无项目 Header | **后端依赖**；不得用 alarm 候选编码覆盖质量点接口 |

> 表中路径统一省略共同前缀 `/api/v1`；路径参数和 query 的精确 DTO/校验仍须以后端源码为准。

## 3. 路由、详情、菜单和按钮的接入顺序

取得后端证据后，每个动作按以下顺序落地，且每一项必须链接回本矩阵的 Controller 方法和注解原文：

1. 为列表路由登记真实 read 权限；详情仅在调用的详情接口注解等价时继承，否则声明自己的要求。
2. 快速创建与真正执行创建的保存接口使用同一要求；合并 `saveOrUpdate` 时以后端实际鉴权语义为准。
3. 新增、编辑、删除、上传/下载、连接测试、执行/暂停、上下线、调度分别保护，不按命名规律生成编码。
4. 批量动作检查批量端点本身的注解，不能以逐条按钮隐藏替代后端批量鉴权。
5. WebSocket、流式日志和下载须单列握手/请求的 Session、403 与项目上下文，不能因普通 GET 已验证而跳过。
6. 组件测试覆盖有权/无权；联调同时证明前端控制和后端 403。只有后端实际拒绝越权请求才可标为完成。

## 4. 解除门禁所需的最小证据

后端负责人需提供固定 commit SHA，以及该版本的业务 Controller、请求/响应 DTO、统一异常处理、
权限注解、权限初始化/迁移 SQL 和项目上下文拦截器。补审时逐方法记录：HTTP 方法、组合路径、
path/query/body/header、校验注解、返回泛型、Session、Security 项目 Header、工作流项目 Header、
权限注解原文和 SQL 权限记录。注解与 SQL 不一致时登记冲突，不任选一方，也不实施前端编码。
