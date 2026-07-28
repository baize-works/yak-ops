<p align="center">
  <img
    src="https://github.com/user-attachments/assets/901d765c-cbd7-4f39-ae3a-de6716ae09f2"
    width="100%"
    alt="Yak Ops Banner"
  />
</p>

<h1 align="center">Yak Ops</h1>

<p align="center">
  A modern, visual, and production-oriented third-party Web UI for Apache SeaTunnel.
</p>

<p align="center">
  <a href="https://github.com/weifuwan/yak-ops/releases">
    <img src="https://img.shields.io/github/v/release/weifuwan/yak-ops?include_prereleases&style=flat-square" alt="Release" />
  </a>
  <a href="https://github.com/weifuwan/yak-ops/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/weifuwan/yak-ops?style=flat-square" alt="License" />
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
  <a href="http://111.230.213.87:8000">Live Demo</a>
  ·
  <a href="https://doc.yak-ops.com/">Documentation</a>
  ·
  <a href="http://111.230.213.87:9001/">Home</a>
  ·
  <a href="https://github.com/weifuwan/yak-ops/issues">Issues</a>
</p>

---

## Quick start

Install `yak-framework:1.0.0-SNAPSHOT` into the same Maven local repository first.

Create the Yak Security database before starting the application:

```sql
CREATE DATABASE yak_security
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

The same statement is available in `scripts/database/create-yak-security-database.sql`.

The default local connection is:

```text
URL:      jdbc:mariadb://127.0.0.1:3306/yak_security
Username: root
Password: 123456
```

Override any value with environment variables when needed:

```text
YAK_SECURITY_DATASOURCE_URL
YAK_SECURITY_DATASOURCE_USERNAME
YAK_SECURITY_DATASOURCE_PASSWORD
YAK_SECURITY_APPLICATION_NAME
YAK_SECURITY_BOOTSTRAP_USERNAME
YAK_SECURITY_BOOTSTRAP_PASSWORD
YAK_SECURITY_BOOTSTRAP_REAL_NAME
```

Build and start:

```bash
mvn clean package -DskipTests
java -jar yak-ops-boot/target/yak-ops-boot-1.0.0.jar
```

Yak Security runs its own Flyway migration against the dedicated security DataSource. On an empty
database it also creates the initial administrator configured in `application.yml`:

```text
Username: root
Password: Root@123456
```

Change the bootstrap password through `YAK_SECURITY_BOOTSTRAP_PASSWORD` outside local development.

Verify the application:

```bash
curl http://localhost:8080/api/test/ping
```

Swagger UI is available at:

```text
http://localhost:8080/swagger-ui.html
```

Use the API group selector to switch between:

- `yak-ops`: `/v3/api-docs/yak-ops`
- `yak-security`: `/v3/api-docs/yak-security`

The login endpoint is public:

```http
POST /yak-security/api/v1/account/login
Content-Type: application/json

{
  "userName": "root",
  "pw": "Root@123456"
}
```

After login, the same-origin Swagger UI keeps the HTTP session cookie and can invoke protected
Security APIs directly.

## Architecture

```text
yak-ops
├── yak-ops-bom
├── yak-ops-common
├── yak-ops-spi
├── yak-ops-core
├── yak-ops-business
│   ├── yak-ops-business-datasource
│   ├── yak-ops-business-job
│   ├── yak-ops-business-workflow
│   ├── yak-ops-business-quality
│   └── yak-ops-business-resource
├── yak-ops-plugins
│   └── yak-ops-plugin-database
│       ├── yak-ops-plugin-database-jdbc
│       │   ├── mysql
│       │   ├── postgresql
│       │   ├── oracle
│       │   └── sqlserver
│       └── yak-ops-plugin-database-doris
├── yak-ops-boot
├── yak-ops-ui
└── yak-ops-dist
```

### Dependency direction

```text
business-* -> core -> spi -> common
plugin-database-jdbc -> spi -> common
plugin-database-doris -> plugin-database-jdbc -> spi -> common
boot -> business-* + plugin-database-jdbc + plugin-database-doris
dist -> boot
```

`yak-framework` is consumed as a second-party dependency through dependency management.
It provides shared security, scheduling, file storage and cross-project common contracts.

Business domains are independent Maven modules so they can evolve with separate dependency sets and
clear compile-time boundaries. `yak-ops-business` is only their reactor aggregator and must not contain
business source code.

Database implementations follow the same rule. `yak-ops-plugin-database` is an aggregator,
`yak-ops-plugin-database-jdbc` contains reusable JDBC support and relational database implementations,
and `yak-ops-plugin-database-doris` contains Doris-specific behavior built on top of the JDBC module.
