<p align="center">
  <img
    src="https://github.com/user-attachments/assets/901d765c-cbd7-4f39-ae3a-de6716ae09f2"
    width="100%"
    alt="Yak Ops 横幅"
  />
</p>

<h1 align="center">Yak Ops</h1>

<p align="center">
  一个面向生产环境的现代化、可视化 Apache SeaTunnel 第三方 Web 管理平台。
</p>

<p align="center">
  <a href="https://github.com/weifuwan/yak-ops/releases">
    <img src="https://img.shields.io/github/v/release/weifuwan/yak-ops?include_prereleases&style=flat-square" alt="版本发布" />
  </a>
  <a href="https://github.com/weifuwan/yak-ops/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/weifuwan/yak-ops?style=flat-square" alt="开源许可证" />
  </a>
  <a href="https://github.com/weifuwan/yak-ops/stargazers">
    <img src="https://img.shields.io/github/stars/weifuwan/yak-ops?style=flat-square" alt="GitHub Stars" />
  </a>
  <a href="https://github.com/weifuwan/yak-ops/issues">
    <img src="https://img.shields.io/github/issues/weifuwan/yak-ops?style=flat-square" alt="GitHub Issues" />
  </a>
  <img src="https://img.shields.io/badge/Java-21-blue?style=flat-square" alt="Java 21" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20-blue?style=flat-square" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/LinkUp-2.3.13-blue?style=flat-square" alt="LinkUp 2.3.13" />
</p>

<p align="center">
  <a href="http://111.230.213.87:8000">在线体验</a>
  ·
  <a href="https://doc.yak-ops.com/">项目文档</a>
  ·
  <a href="http://111.230.213.87:9001/">项目首页</a>
  ·
  <a href="https://github.com/weifuwan/yak-ops/issues">问题反馈</a>
</p>

---

## 项目介绍

**Yak Ops** 是一个面向 **Apache SeaTunnel** 构建的独立第三方 Web 管理平台。

它提供了一种直观、实用的方式来创建、配置、运行、调度和监控数据同步任务，用户无需再手动维护复杂的 LinkUp 配置文件。

通过 Yak Ops，用户可以在统一的 Web 界面中管理数据源、构建离线与实时同步链路、配置字段映射、生成 LinkUp 任务配置、向 LinkUp 引擎提交任务、查看运行日志并监控执行指标。

> 我们的目标很简单：让 Apache SeaTunnel 在真实的数据集成场景中更容易使用。

## 核心能力

### 可视化任务编排

通过拖拽式 DAG 编辑器构建数据同步链路。

用户可以可视化配置 Source、Transform 和 Sink 节点，让复杂的数据同步流程更加直观，也更易于维护。

### 离线与实时同步

通过统一界面创建和管理离线批处理任务与实时流式同步任务。

Yak Ops 支持多种任务创建方式，包括可视化向导配置和脚本模式配置。

### 数据源管理

统一管理常用数据源，包括：

* MySQL
* PostgreSQL
* Oracle
* 其他兼容 JDBC 的数据源

用户可以配置数据源连接、测试连通性、读取元数据，并在不同任务中复用已创建的数据源。

### 字段映射与数据转换

通过可视化方式配置源端字段与目标端字段的映射关系。

Yak Ops 同时支持基于 SQL 的数据转换，并能够自动生成对应的 LinkUp 任务配置。

### 任务全生命周期管理

管理 LinkUp 任务的完整生命周期：

* 创建和编辑任务
* 发布任务定义
* 提交任务
* 停止运行中的任务
* 查看执行历史
* 查看运行日志
* 跟踪任务状态
* 管理定时调度

### 运行指标

直接在 Web 界面中查看关键运行指标，包括：

* 读取行数
* 写入行数
* 读取 QPS
* 写入 QPS
* 数据量
* 任务状态
* 任务执行进度

内置的指标页面能够帮助用户快速了解任务运行情况，在进行基础问题排查时，无需额外部署独立的监控平台。

### 自动生成任务配置

Yak Ops 可以将可视化任务定义转换为可执行的 LinkUp 配置文件。

这能够减少重复的配置工作，并帮助团队统一数据同步任务的开发规范。

## 为什么选择 Yak Ops？

Apache SeaTunnel 提供了强大的数据集成能力，但在大规模或多团队协作环境中，手动编写和维护配置文件仍然存在一定门槛。

Yak Ops 适合有以下需求的团队：

* 为 Apache SeaTunnel 提供可视化 Web 管理界面
* 统一管理数据源
* 通过低代码方式配置数据同步链路
* 复用已有同步流程
* 统一管理离线和实时任务
* 管理任务调度和执行历史
* 查看运行日志和指标
* 降低配置与维护成本
* 降低新用户上手门槛

## 兼容性

当前版本支持或推荐使用以下环境：

| 组件 | 支持或推荐版本 |
| --- | --- |
| Apache SeaTunnel | 2.3.13 |
| Java | JDK/JRE 21 |
| Node.js | 20 及以上，仅源码构建时需要 |
| Yarn | Yarn Classic 1.x |
| MySQL | 推荐 MySQL 8.0 |
| Docker | Docker Engine 或 Docker Desktop |
| Docker Compose | Compose v2 |
| 操作系统 | 推荐 Linux |
| 浏览器 | 最新版 Chrome 或 Edge |

> Yak Ops 在连接 LinkUp 引擎时会进行版本校验，请使用当前支持的 LinkUp 版本。

## 系统架构

Yak Ops 采用前后端分离架构。

在容器化部署模式下，Nginx 用于提供前端静态资源，并将 API 和 WebSocket 请求代理到 Spring Boot 服务。Spring Boot 服务负责连接 Yak Ops 元数据库，并与已配置的 Apache SeaTunnel 引擎进行通信。

<img width="1448" height="1086" alt="Yak Ops 系统架构" src="https://github.com/user-attachments/assets/187f2558-3668-4cc0-9ba8-9eb8807c3b02" />


## 快速开始

推荐使用 Docker Compose 在本地运行 Yak Ops。

完整的安装和部署说明请参考项目文档：

**项目文档：**  
https://doc.yak-ops.com/

### 方式一：使用 Docker Compose 和 MySQL 部署

该方式会同时启动以下服务：

* MySQL 8.0
* Yak Ops API
* Nginx 前端服务

克隆项目并创建环境变量文件：

```bash
git clone https://github.com/weifuwan/yak-ops.git
cd yak-ops
cp .env.example .env
```

构建并启动服务：

```bash
docker compose up -d --build
```

访问 Yak Ops：

```text
http://localhost:9527
```

查看服务状态和日志：

```bash
docker compose ps
docker compose logs -f yak-ops-api
```

停止服务：

```bash
docker compose down
```

如需重新创建本地 MySQL 数据库，并再次执行初始化脚本：

```bash
docker compose down -v
docker compose up -d --build
```

> `docker compose down -v` 会永久删除由 Docker Compose 管理的 MySQL 数据卷，请谨慎执行。

### 方式二：使用 Docker Compose 连接已有 MySQL

当宿主机已经安装 MySQL，或 MySQL 部署在其他服务器上时，可以使用该方式。

启动 Yak Ops 前，请先创建外部数据库并执行 MySQL 初始化 SQL。相关 SQL 文件位于发行包的 `sql/` 目录中，也可以在源码仓库的以下目录中找到：

```text
yak-ops-api/src/main/resources/sql/
```

创建环境变量文件：

```bash
cp .env.without-mysql.example .env.without-mysql
```

配置已有数据库：

```env
MYSQL_HOST=host.docker.internal
MYSQL_PORT=3306
MYSQL_DATABASE=yak_ops
MYSQL_USER=linkup
MYSQL_PASSWORD=change_me
```

在 Windows 或 macOS 的 Docker Desktop 环境中，请使用：

```env
MYSQL_HOST=host.docker.internal
```

如果连接远程 MySQL 服务器，请将 `MYSQL_HOST` 设置为对应的主机名或 IP 地址。

MySQL 用户必须允许来自 Docker 宿主机的连接，建议创建独立数据库用户：

```sql
CREATE USER IF NOT EXISTS 'linkup'@'%' IDENTIFIED BY 'change_me';
GRANT ALL PRIVILEGES ON yak_ops.* TO 'linkup'@'%';
FLUSH PRIVILEGES;
```

启动 Yak Ops，但不启动新的 MySQL 容器：

```bash
docker compose   --env-file .env.without-mysql   -f compose.without-mysql.yaml   up -d --build
```

查看日志：

```bash
docker compose   --env-file .env.without-mysql   -f compose.without-mysql.yaml   logs -f yak-ops-api
```

### 方式三：从源码构建发行包

环境要求：

* JDK 21
* Node.js 20 及以上
* Yarn Classic
* MySQL 8.0
* Maven，或项目中自带的 Maven Wrapper

首先构建前端资源：

```bash
cd yak-ops-ui
yarn install --frozen-lockfile
yarn build
cd ..
```

在项目根目录构建完整发行包：

```bash
./mvnw clean package -DskipTests
```

Windows 环境执行：

```cmd
mvnw.cmd clean package -DskipTests
```

生成的发行包位于：

```text
yak-ops-dist/target/
```

发行包目录结构如下：

```text
yak-ops-<version>/
├── bin/
│   ├── run-yak-ops.sh
│   ├── start-yak-ops.sh
│   ├── status-yak-ops.sh
│   └── stop-yak-ops.sh
├── conf/
│   ├── application.yml
│   ├── logback-spring.xml
│   └── nginx/
│       └── default.conf
├── jdbc-drivers/
├── libs/
│   └── yak-ops-api.jar
├── sql/
├── web/
├── LICENSE
├── NOTICE
└── README.md
```

同一个发行包会用于构建以下两个运行时镜像：

* `yak-ops-api`：Java 21 后端运行时镜像
* `yak-ops`：Nginx 前端和反向代理镜像

如果采用 Linux 手动部署，请解压发行包，检查 `conf/application.yml` 配置，使用 `bin/` 目录下的脚本启动后端服务，并通过 `conf/nginx/default.conf` 配置 Nginx。

### 连接 Apache SeaTunnel

Yak Ops 启动后：

1. 打开 LinkUp 客户端管理页面。
2. 添加 Apache SeaTunnel 2.3.13 引擎地址。
3. 测试连接。
4. 创建数据源。
5. 创建并发布数据同步任务。
6. 提交任务并查看运行日志和指标。

## 开发说明

### 后端开发

环境要求：

* JDK 21
* Maven 3.8 及以上
* MySQL 8.0

启动后端服务：

```bash
./mvnw clean install -DskipTests
./mvnw -pl yak-ops-api spring-boot:run
```

后端默认端口：

```text
9527
```

### 前端开发

进入前端目录：

```bash
cd yak-ops-ui
```

安装依赖：

```bash
yarn
```

构建生产环境资源：

```bash
yarn build
```

## 项目文档

详细的安装、配置、运维和使用指南请查看：

### Yak Ops 项目文档

https://doc.yak-ops.com/

文档内容包括：

* 环境准备
* 数据库初始化
* LinkUp 引擎配置
* 数据源管理
* 离线同步
* 实时同步
* 工作流配置
* 字段映射
* 任务调度
* 运行日志
* 指标监控
* Docker 和 Docker Compose 部署
* 常见问题排查

## 在线体验

在线体验环境地址：

http://111.230.213.87:8000

该环境仅用于产品预览和功能体验。

请勿在公共体验环境中填写机密数据、敏感数据或生产环境数据。

## 后续规划

计划持续完善以下能力：

* 支持更多数据源插件
* 兼容更多 LinkUp 版本
* 完善版本升级和数据库迁移能力
* 增强任务配置校验
* 增加告警和通知能力
* 完善运行监控能力
* 增强权限管理
* 完善国际化支持
* 完善容器镜像发布、升级和迁移工具

后续规划的优先级可能会根据社区反馈和实际使用场景进行调整。

## 已知限制

使用当前版本前，请注意：

* 当前已完成验证的 LinkUp 版本为 2.3.13。
* Yak Ops 元数据库推荐使用 MySQL 8.0。
* 部分高级 LinkUp Connector 参数仍可能需要通过脚本模式进行配置。
* 生产环境部署时，请使用安全的数据库密码、持久化数据卷，并限制网络访问范围。
* 公共体验环境禁止使用敏感数据。
* 升级到新版本前，请备份 Yak Ops 数据库。

在生产环境部署前，建议先查看当前未解决的问题：

https://github.com/weifuwan/yak-ops/issues

## 参与贡献

非常欢迎大家参与贡献。

你可以通过以下方式参与项目：

* 提交 Bug
* 提交功能建议
* 完善项目文档
* 添加数据源插件
* 修复已有问题
* 完善测试覆盖率
* 分享部署和使用经验
* 帮助其他社区用户

推荐的贡献流程：

1. Fork 项目仓库。
2. 创建功能分支。
3. 完成修改并进行测试。
4. 提交 Pull Request。
5. 清晰描述修改动机、实现方式和验证过程。

项目仓库：

https://github.com/weifuwan/yak-ops

问题反馈：

https://github.com/weifuwan/yak-ops/issues

Pull Request：

https://github.com/weifuwan/yak-ops/pulls

## 社区交流

如果你对 Yak Ops 感兴趣，希望分享使用反馈，或愿意参与项目建设，欢迎加入社区交流。

参与贡献并不局限于编写代码。完善文档、参与测试、提交问题、讨论功能、提出产品建议以及分享使用经验，都非常有价值。

<p align="center">
  <img
    width="200"
    height="320"
    src="https://github.com/user-attachments/assets/41de5095-91af-41e6-9345-7c26496f9469"
    alt="Yak Ops 社区交流群"
  />
</p>

<p align="center">
  欢迎加入 Yak Ops 社区，一起参与项目建设。
</p>

## 安全说明

请不要通过公开的 GitHub Issue 披露安全漏洞。

提交安全问题时，请尽量提供以下信息：

* 受影响的版本
* 受影响的组件
* 问题复现步骤
* 潜在影响
* 可行的修复建议（如有）

后续将在 `SECURITY.md` 中补充专门的安全问题报告流程。

## 开源许可证

Yak Ops 基于 Apache License 2.0 开源。

详细信息请查看 [LICENSE](./LICENSE) 文件。

## 免责声明

Yak Ops 是一个独立的第三方项目。

本项目不是 Apache 软件基金会的官方项目，也未获得 Apache 软件基金会的隶属、认可或背书。

Apache SeaTunnel、LinkUp、Apache 以及 Apache 羽毛标志均为 Apache 软件基金会的商标。

本项目名称和文档中使用 Apache SeaTunnel，仅用于说明本项目与 Apache SeaTunnel 的兼容性和集成关系。

---

<p align="center">
  由 Yak Ops 社区用 ❤️ 构建
</p>

<p align="center">
  <a href="https://github.com/weifuwan/yak-ops">GitHub</a>
  ·
  <a href="https://doc.yak-ops.com/">项目文档</a>
  ·
  <a href="https://github.com/weifuwan/yak-ops/issues">问题反馈</a>
</p>
