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
