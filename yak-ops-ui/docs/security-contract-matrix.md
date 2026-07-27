# Yak Security 接口合同矩阵与集成审计

> 审计日期：2026-07-27；yak-ops 基线：`0e52fd7`（当前 `work` 分支）。
>
> **合同规则**：只有 yak-ops 当前源码与 `yak-framework/yak-security` 当前 `main`
> 的 Controller、DTO/VO、权限注解、OpenAPI 和 SQL 互相印证的内容才能标为“已确认”。
> README 仅作线索，不能单独定案；路径、字段或权限不得按命名规律推测。

## 1. 审计范围、来源和阻塞项

本次已逐项检查 yak-ops 的请求封装、启动身份探测、登录类型、导航、布局、Security
service、开发代理和 nginx 集成配置。仓库不包含 `yak-security` 源码、submodule、Maven
依赖、生成的 OpenAPI 或固定 upstream revision，且未配置 Git remote。

尝试读取 upstream `main` 时，环境对 GitHub 的 HTTPS CONNECT 返回 403。因此除需求方已确认的
`GET /api/v1/account/current` 外，当前无法取得一手后端源码；下表严格把所有不能双向核验的项目
标记为 **待 upstream 补审**，而不是沿用 README 或根据 REST 惯例补造接口。

| 来源 | 本次可用性 | 合同用途 |
| --- | --- | --- |
| yak-ops `a901268` | 可用 | 记录当前调用、代理重写和前端假设 |
| yak-security `main` SHA | **未知/阻塞** | 必须由有 upstream 权限者填写精确 SHA |
| Controller、DTO、VO、权限注解、OpenAPI、SQL | **不可用/阻塞** | 未核验项不得进入产品代码 |
| yak-security README | **不可用，且非定案来源** | 即使取得也只能辅助定位源码 |

## 2. 路径 namespace 与集成提交审计

公开浏览器路径 `/yak-security/**` 是 yak-ops 的 **ingress namespace**：开发代理及 nginx
都剥离 `/yak-security` 后把请求交给 `localhost:9527` / `yak-ops-api:9527`。因此后端 Controller
合同应记录为 `/api/v1/**`，同时另列浏览器可见路径 `/yak-security/api/v1/**`。

| 项目 | yak-ops 当前事实 | 结论 |
| --- | --- | --- |
| current | 前端调用 `GET /yak-security/api/v1/account/current`；代理后为 `GET /api/v1/account/current` | **已确认路径**；需要 Session；项目 Header 尚待确认 |
| login | Security service 当前调用 `POST /yak-security/api/v1/account/login`；旧登录类型仍调用 `POST /api/v1/login` | 两者均只是前端调用。Controller 未核验，**namespace、方法、DTO 待确认** |
| logout | Security service 当前调用 `POST /yak-security/api/v1/account/logout` | 只是前端假设。Controller 未核验，**namespace、方法待确认** |
| Google login | 旧登录类型调用 `POST /api/v1/auth/google/login` | yak-ops 旧调用，**不属于已确认 Security 合同** |
| 代理集成提交 | `c863dc91c017d2c96690e44c1536f042dc04b2ee` 增加 UI/nginx 前缀剥离与 Cookie 重写 | 本地提交可审计；因 upstream SHA 不可得，**无法判断与 upstream main 是否一致** |

> 特别注意：nginx 把 upstream Cookie path 重写为 `/yak-security/`。这会使浏览器不在普通
> `/api/**` 请求携带该 Cookie；实际 `Set-Cookie`、登录/current/logout 的 Session 连续性必须联调。

## 3. 通用协议合同

| 维度 | yak-ops 当前实现/假设 | Security 源码结论 | 状态与行动 |
| --- | --- | --- | --- |
| envelope | TypeScript 为 `{ code: number, msg: string, message?: string, data: T }` | 未核验统一响应类 | **待确认** `msg`/`message`、`data` nullable、无 body 情况 |
| 成功码 | Security namespace 仅接受业务码 `200` | 未核验 | **待确认**；不可从 HTTP 200 推导业务成功 |
| 未登录 | HTTP 401；或业务码 `1/401`；或消息 `NOT_LOGIN/UNAUTHENTICATED/SESSION_EXPIRED/SESSION_INVALID` | 未核验异常处理器 | 仅为前端兼容集合，**不是合同** |
| 禁止访问 | 前端只按 HTTP 403 展示 | 未核验 HTTP/业务码 | **待确认** 401 与 403 的边界 |
| Session | 请求统一 `credentials: include`，不使用 bearer token | current 已知需要 Session | **部分确认**；Cookie 名、Path、Domain、SameSite、Secure、CSRF 待确认 |
| 分页 | 未建立 Security 分页类型 | 未核验 Page DTO/VO | **待确认** 页码基数、字段名、总数字段、空页语义 |
| 项目 Header | 请求拦截器没有注入项目 Header；布局仅在内存保存所选项目 | 未核验 Header 名/必填范围 | **高风险待确认**；不得自行添加名称 |
| nullable | 前端把缺失角色/权限/项目变为 `[]`，`deptId` 变为 `null` | 未核验 Jackson/校验注解/数据库约束 | 只是 fail-closed 前端策略，**不是后端字段合同** |

## 4. Controller 接口登记矩阵

“候选操作”是计划页面必须覆盖的能力清单，不表示存在同名 endpoint。只有 current 的方法和路径
已由阶段输入确认；其余路径栏故意不填写猜测值。

| 领域 | 候选页面操作 | HTTP + Controller path | DTO / VO / 分页 | 权限注解编码 | SQL 出处 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| Account | 登录 | **待确认** | 登录 DTO、空返回待确认 | 匿名白名单待确认 | 不适用 | upstream 缺失 |
| Account | 当前身份 | `GET /api/v1/account/current`（公开路径带 `/yak-security`） | Current VO 字段待确认 | 需 Session；项目 Header/额外权限待确认 | 身份关系 SQL 待确认 | **仅方法/路径/Session 已确认** |
| Account | 退出 | **待确认** | 返回 envelope/body 待确认 | Session 要求待确认 | 不适用 | upstream 缺失 |
| User | 列表/详情/新增/修改/删除或停用/重置密码/分配角色/分配部门 | **待确认** | 全部 DTO/VO、分页、nullable 待确认 | **待确认** | **待确认** | Controller/DTO/注解/SQL 均缺失 |
| Role | 列表/详情/新增/修改/删除/分配权限/分配用户 | **待确认** | 全部待确认 | **待确认** | **待确认** | upstream 缺失 |
| Permission | 树或列表/详情/新增/修改/删除 | **待确认** | 树节点、类型、父子/null 待确认 | **待确认** | **待确认** | upstream 缺失 |
| Department | 树或列表/详情/新增/修改/删除/成员关系 | **待确认** | 父部门、负责人、树字段/null 待确认 | **待确认** | **待确认** | upstream 缺失 |
| Project | 列表/详情/新增/修改/删除/成员或角色授权/切换上下文 | **待确认** | 项目 VO 与分页待确认 | **待确认** | **待确认** | 与 yak-ops workflow project 必须区分；upstream 缺失 |
| Resource Permission | 资源授权列表/授予/撤销/查询当前主体资源权限 | **待确认** | 主体类型、资源类型、范围 DTO 待确认 | **待确认** | **待确认** | upstream 缺失 |
| Config | 列表/详情/新增或修改/删除 | **待确认** | 值类型、敏感值遮蔽、nullable 待确认 | **待确认** | **待确认** | upstream 缺失 |
| Message | 列表/详情/未读数/标记已读/删除 | **待确认** | 分页、状态、时间字段待确认 | **待确认** | **待确认** | 顶栏铃铛当前无 Security 请求；upstream 缺失 |
| Operation Log | 分页查询/详情/导出或删除（若源码存在） | **待确认** | 过滤器、详情、分页待确认 | **待确认** | **待确认** | upstream 缺失 |

### 权限编码登记

当前 `navigation.ts` 的路由没有声明任何 `requiredPermission` / `anyPermissions`，所以 yak-ops
产品源码没有可登记为合同的具体权限字符串。测试中的 `task:read` 只是测试夹具，不是 Security
权限编码。由于权限注解和初始化 SQL 均不可用，本合同登记的权限编码集合为 **空集（待补审）**；
严禁从菜单 ID、Controller 名或旧 README 自造编码。

补审时每个编码必须同时记录：`Controller#method`、注解原文、SQL 文件及行/记录；注解与 SQL
不一致时标记冲突，不任选其一。

## 5. current 身份字段与 nullable 矩阵

| 语义 | yak-ops 当前读取字段 | 当前 fail-closed 行为 | 后端待核验内容 |
| --- | --- | --- | --- |
| 用户 ID | `id` | 转为布局 `userid` 字符串 | Java/JSON 类型、是否可空 |
| 用户名 | `userName` | 作为显示名后备 | 校验、唯一性、是否可空 |
| 真实姓名 | `realName` | 空白时回退 `userName` | 缺失与 null 语义 |
| 邮箱/电话 | `email`, `phone` | null 转 undefined | nullable 与脱敏规则 |
| 角色 | `roleList` | 缺失/null/非数组 → `[]` | 元素 VO、字段及空集合序列化 |
| 权限 | `permissionCodes` | 缺失/null/非数组 → `[]` 并默认拒绝 | 是否直接由 current 返回、编码来源 |
| Security 项目 | `projectList` | 缺失/null/非数组 → `[]` | `id/projectCode/projectName` 类型与项目 Header 关系 |
| 当前部门 | `deptId` | 缺失/null → `null`，不反查 | 单 ID、部门 VO 或上下文；数值宽度 |

这些字段目前来自 yak-ops 的 `API.CurrentUserVO` 声明，不能作为 yak-security VO 已存在这些字段的
证据。禁止用 User/Role/Department/Permission/Project 管理列表拼装当前身份。

## 6. 计划页面/入口覆盖审计

| 前端入口或操作 | 当前请求 | Controller 证据 | 验收判断 |
| --- | --- | --- | --- |
| 登录表单提交 | Security service 的 account/login | 无 | **缺失/待确认** |
| 应用启动、刷新、登录后身份复查 | account/current | 方法/路径由阶段输入确认 | **部分满足**；VO/envelope/Header 未完成 |
| 用户菜单退出 | Security service 的 account/logout | 无 | **缺失/待确认** |
| 顶栏项目选择 | 无请求，仅写 `initialState` | 无 | **缺失/待确认**；尚未向后端传播项目上下文 |
| 顶栏消息 | 仅视觉入口 | 无 | **缺失/待确认** |
| Account/User/Role/Permission/Department 管理页 | 当前导航无对应页面/操作 | 无 | **产品页缺失；接口待确认** |
| Security Project/Resource Permission/Config/Operation Log 管理页 | 当前导航无对应页面/操作 | 无 | **产品页缺失；接口待确认** |

## 7. upstream 补审与联调清单

1. 有权限人员记录 yak-security `main` 的完整 SHA，并导出 Controller、DTO/VO、全局响应与异常类、
   权限注解、OpenAPI、schema/初始化/迁移 SQL；在该 SHA 上完成第 4、5 节逐行回填。
2. 对每个 Controller 方法记录 HTTP 方法、组合后的 path、query/path/body/header、校验注解、返回
   泛型、权限注解；把 OpenAPI 差异作为漂移缺陷，而不是用 OpenAPI 覆盖源码。
3. 对权限注解编码与 SQL 权限记录做机械集合比对，并明确默认拒绝、超级管理员和项目范围规则。
4. 在浏览器或受控客户端抓取 login、current、logout：记录公开路径、重写后路径、HTTP 状态、完整
   envelope（脱敏）、`Set-Cookie` 属性以及退出后的 Cookie/Session 状态。
5. 覆盖异常场景：匿名 current、无项目用户、无权限用户、停用用户；分别记录 401/403 与业务码。
6. 明确项目 Header 的精确名称、值类型、哪些方法强制要求，以及 current 是否例外；确认前不得实现。
7. 只有 Controller 与证据列补齐后，才能把某行从“待确认”改成“已确认”并生成前端 service。

## 8. 阶段结论

本阶段建立了“未知即未知”的唯一矩阵：没有把旧 README、现有前端 URL、测试字符串或 REST
命名习惯冒充 Security 合同。当前唯一已确认的接口事实是 Session 支持的
`GET /api/v1/account/current`（经 yak-ops ingress 为
`GET /yak-security/api/v1/account/current`）。由于 upstream `main` 无法访问，本阶段不能诚实地
宣称完成 Controller/DTO/权限/SQL 全量合同；该项是明确的外部补审门禁，而不是可猜测的实现空白。

业务权限扩展的 11 类页面、当前 `/api/v1/**` 调用和占位状态已单独登记在
[`business-security-contract-matrix.md`](./business-security-contract-matrix.md)。该矩阵明确区分前端事实、
占位页面与后端依赖；在 Controller 注解和权限 SQL 可审计前，不从现有导航候选字符串继续生成按钮权限。

## 9. 用户/角色管理阶段门禁复核

2026-07-27 在开始用户与角色管理页面前再次执行了源码发现：工作区没有 yak-security 源码、
OpenAPI 或固定版本依赖；尝试从 `https://github.com/yak-framework/yak-security.git` 获取
`main`，仍被当前环境的 HTTPS CONNECT 以 403 拒绝。因此第 4 节中 User 与 Role 的合同状态
没有发生变化。

本阶段不能在产品代码中新增 `services/security/users.ts`、`roles.ts`，也不能把用户/角色页面的
空状态替换为可提交表单。否则必须猜测下列安全敏感合同，并会违反本矩阵的“源码与注解双重确认”
规则：

* 用户分页、详情、创建、修改、管理员重置密码、角色分配、删除及唯一性校验的 HTTP 方法、路径、
  DTO/VO、分页结构、项目 Header 和权限编码；
* 角色分页、详情、创建、修改、权限树回显/保存、用户分配、删除检查/删除的同一组合同；
* 唯一冲突、关联冲突、最后一个管理员保护和无权限访问的 HTTP/业务错误映射；
* 权限树父子关系、半选保存语义，以及角色基本信息与权限保存的事务边界。

解除门禁所需的最小交付物是一个可审计的 yak-security commit SHA，以及该 SHA 对应的 User/Role
Controller、请求与响应 DTO/VO、统一异常处理、权限注解、权限初始化 SQL 和数据库约束/迁移。
取得这些材料后，应先回填第 3 至 5 节，再实现 service 和页面；不得用页面需求文字反向生成接口。

## 10. 资源授权阶段字段审计与门禁复核

2026-07-27 在资源授权开发前再次检查了工作区的 Java 源码、OpenAPI/Swagger
产物和 Maven 依赖，未找到 `Resource Permission Controller`、其 DTO/VO、权限注解或
资源权限 SQL。对 `https://github.com/yak-framework/yak-security.git` 的 `git ls-remote`
仍被 HTTPS CONNECT 403 拒绝。因此第 4 节的 Resource Permission 行仍为待确认，
不能新增 `services/security/resourcePermissions.ts` 或将资源授权页面接入猜测的接口。

### 10.1 禁止猜测的字段

| 字段 | 需从后端源码确认的语义 | 当前结论 |
| --- | --- | --- |
| `showLevel` | 是响应的展示深度、查询层级还是授权级别；类型、枚举原值及各端点的可选范围 | **待确认**；不得声明为布尔值 |
| `controlLevel` | 权限控制开关作用于全局、项目、资源类型还是资源；枚举原值和关闭后的鉴权行为 | **待确认**；不得声明为布尔值 |
| `assignFlag` | 是显式授权、继承授权、选择状态还是查询条件；是否可写及枚举原值 | **待确认**；不得声明为布尔值 |
| `projectId` / `resourceTypeId` / `resourceId` | 项目、资源类型、具体资源三层中每层的必填组合，以及缺失、`null` 和 `0` 的不同语义 | **待确认**；不得在前端自行归一化 |
| `userIdList` | 是 assign/batch 的目标用户，还是查询过滤条件；空、缺失、重复 ID 的语义 | **待确认** |
| `excludeUserIdList` | 排除的是用户还是授权主体，可用于哪些层级和视角 | **待确认**；禁止与 `excludeIdList` 互换 |
| `excludeIdList` | 元素是资源 ID、授权关系 ID 还是其他 ID，可用于哪些层级和视角 | **待确认**；禁止与 `excludeUserIdList` 互换 |

### 10.2 解除实现门禁所需证据

必须在一个固定的 yak-security commit SHA 上逐项登记：按用户查询、按资源查询、
assign、revoke、batch、exclude、resource-type import 和 control toggle 的 Controller
方法与组合路径；每个方法的 query/path/body/header、校验注解、DTO/VO 与返回泛型；
Session 要求、项目 Header 精确名称及必填范围；权限注解原文与初始化 SQL 的编码对应。

另需从实现或测试锁定以下行为：取消授权是删除显式关系还是恢复继承；预览影响范围
与最终校验是否使用同一快照/版本；批量部分成功的逐项结果结构；继承来源和原始层级的
返回方式；项目切换时旧请求的取消与响应隔离策略。证据补齐前，页面保持无可提交的占位状态，
且不建立会持久化授权身份的 Zustand store。
