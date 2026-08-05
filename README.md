<p align="center">
  <img
    src="https://github.com/user-attachments/assets/901d765c-cbd7-4f39-ae3a-de6716ae09f2"
    width="100%"
    alt="Yak Ops Banner"
  />
</p>

<h1 align="center">Yak Ops</h1>

<p align="center">
  A modern, visual, and production-oriented data operations platform.
</p>

## Quick start

Install `yak-framework:1.0.0-SNAPSHOT` into the same Maven local repository first.

Create the Yak Security database:

```sql
CREATE DATABASE yak_security
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Build and start:

```bash
mvn clean package -DskipTests
java -jar yak-ops-boot/target/yak-ops-boot-1.0.0.jar
```

Verify the application:

```bash
curl http://localhost:8080/api/test/ping
```

Swagger UI:

```text
http://localhost:8080/swagger-ui.html
```

## Architecture

```text
yak-ops
├── yak-ops-bom
├── yak-ops-common
├── yak-ops-spi
├── yak-ops-core
├── yak-ops-business
│   ├── yak-ops-business-datasource
│   ├── yak-ops-business-data-development
│   ├── yak-ops-business-job
│   ├── yak-ops-business-quality
│   ├── yak-ops-business-resource
│   └── yak-ops-business-sync
├── yak-ops-plugins
│   ├── yak-ops-plugin-datasource
│   ├── yak-ops-plugin-storage
│   └── yak-ops-plugin-task
│       ├── yak-ops-plugin-task-api
│       ├── yak-ops-plugin-task-jdbc-sql
│       ├── yak-ops-plugin-task-http
│       └── yak-ops-plugin-task-all
├── yak-ops-boot
├── yak-ops-ui
└── yak-ops-dist
```

### Data development

Data Development owns:

```text
Project / Folder / Task
Draft Revision
Immutable Task Version
Execution / Attempt / Event / Result
```

It is independent from workflow orchestration. Task execution is discovered directly through `TaskPluginCatalog` and the generic contracts in `yak-ops-plugin-task-api`.

### Task Plugin Phase One

The first refactoring phase supports only:

```text
SQL  -> JDBC SQL -> TABLE result
HTTP -> JDK HTTP -> JSON result
```

A `TaskPluginFactory` owns metadata, default definitions, normalization, validation, compilation and creation of an attempt-scoped `TaskExecutor`.

```text
TaskPluginFactory
       ↓ ServiceLoader
TaskPluginCatalog
       ├─ Authoring / Validation / Compilation
       └─ TaskExecutor
              ↓
Data Development Execution Gateway
```

Shell, Python, Flink SQL, Notebook and data-integration development nodes have been removed from the phase-one runtime.

### Workflow boundary

The previous Workflow frontend, backend business module, SPI and executor registry have been removed. Workflow will be redesigned as an independent orchestration domain that references immutable Task Versions instead of embedding SQL, HTTP or other plugin configuration.

Historical workflow database tables are not automatically dropped, so existing deployments can retain audit data and decide on migration separately.

### Datasource plugins

Datasource plugins continue to provide connection normalization, connection tests and Catalog metadata capabilities. The next task-plugin phase should make SQL tasks reference managed datasource IDs instead of persisting independent JDBC credentials in task definitions.

## Security note

HTTP requests and SQL statements can access external systems. Production deployments should apply project permissions, network restrictions, SQL audit rules and secret management before granting task execution access.
