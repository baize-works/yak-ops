# 阶段 0：Yak Security 当前身份契约核对

## 结论

本仓库不包含 Yak Security 的 `AccountController`、DTO/VO、权限注解或数据库脚本，且没有以 Maven 依赖、Git submodule 或生成的 OpenAPI 文档固定其版本。因此，当前仓库**无法从可审计的一手后端源码确认** `/yak-security/api/v1/account/current` 对下列字段的精确名称、类型及空值语义。

在取得与部署版本完全一致的 Yak Security 源码或 OpenAPI 之前，下表全部属于后端接口依赖，不能把前端既有声明当作后端事实：

| 身份信息 | 前端暂用字段 | 缺失或 `null` 时的唯一允许语义 |
| --- | --- | --- |
| 用户 ID | `id` | 登录身份不完整；不得通过用户列表反查 |
| 用户名 | `userName` | 登录身份不完整；不得通过用户列表反查 |
| 真实姓名 | `realName` | 展示时回退到 `userName` |
| 角色列表 | `roleList` | 空角色列表 `[]` |
| 权限编码 | `permissionCodes` | 空权限集 `[]`，所有受控能力默认拒绝 |
| Security 授权项目列表 | `projectList` | 无项目 `[]` |
| 当前部门 | `deptId` | 无部门 `null` |

## 后端接口依赖

Yak Security 需要在 `GET /api/v1/account/current` 的响应 VO（经网关后的完整路径为 `/yak-security/api/v1/account/current`）中直接提供上表所需的当前身份上下文，并明确：

1. Java 字段、序列化 JSON 字段、数值宽度，以及字段是缺失、`null` 还是空数组；
2. 角色元素和 Security 项目元素的精确 VO 字段；
3. 权限注解使用的权限字符串与数据库初始化脚本中的权限编码完全一致；
4. “当前部门”是单个部门 ID、部门 VO，还是可切换的部门上下文；
5. 项目列表是当前用户已授权项目，而不是用户有权管理的项目全集。

验收这项依赖时必须逐项对照部署版本的 `AccountController`、current 响应 DTO/VO、控制器/方法权限注解，以及用户—角色—权限、用户—部门、用户—Security 项目关系和初始化数据脚本，并把确认后的类名、提交版本和字段映射补回本文。

## 前端边界

前端只调用 `AccountController/current` 建立当前身份。响应未提供扩展上下文时，规范化逻辑固定为“无部门 / 无项目 / 权限为空（并同时使用空角色列表）”。禁止调用用户、角色、部门、权限或项目的管理端列表接口后，按用户名或 ID 拼装当前身份；管理权限不等于被管理对象的身份授权，这种拼装既可能越权，也会在分页、筛选或同名数据下产生错误授权。
