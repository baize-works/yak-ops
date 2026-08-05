<p align="center">
  <img
    src="https://github.com/user-attachments/assets/901d765c-cbd7-4f39-ae3a-de6716ae09f2"
    width="100%"
    alt="Yak Ops Banner"
  />
</p>

<h1 align="center">Yak Ops</h1>

<p align="center">
  A focused data operations platform for datasource management, offline synchronization, resources, and system administration.
</p>

## Current scope

Yak Ops currently keeps a deliberately small and maintainable feature set:

- datasource management;
- offline synchronization under Data Integration;
- resource management, including files, clients, and connectors;
- system management and security administration.

Data Development, realtime synchronization, and Data Quality have been removed from the active codebase. These domains can be redesigned independently before being introduced again.

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
│   ├── yak-ops-business-job
│   ├── yak-ops-business-resource
│   └── yak-ops-business-sync
│       └── yak-ops-business-sync-offline
├── yak-ops-plugins
│   ├── yak-ops-plugin-datasource
│   └── yak-ops-plugin-storage
├── yak-ops-boot
├── yak-ops-ui
└── yak-ops-dist
```

### Offline synchronization

Offline synchronization keeps task definition management, Link-Up engine integration, worker registration, execution reconciliation, and scheduling support.

### Datasource plugins

Datasource plugins provide connection normalization, connection tests, and catalog metadata capabilities.

### Resource management

Resource management supports managed files and pluggable Local, MinIO, and HDFS storage backends.

## Removed domains and data

The following runtime modules and frontend pages are no longer assembled:

- Data Development and its task plugins;
- realtime synchronization;
- Data Quality and its scheduling integration.

Existing database tables are not automatically dropped. Deployments that already contain historical data can retain it for audit or migrate it separately.

## Security note

Datasource connections and offline synchronization can access external systems. Production deployments should apply project permissions, network restrictions, audit rules, and secret management before granting access.
