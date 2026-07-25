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
  <img src="https://img.shields.io/badge/SeaTunnel-2.3.13-blue?style=flat-square" alt="SeaTunnel 2.3.13" />
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

## Overview
```
yak-ops
├── 核心业务
│   ├── yak-ops-domain
│   └── yak-ops-application
│
├── 接口接入
│   ├── yak-ops-web
│   └── yak-ops-web-contract
│
├── 基础设施
│   ├── yak-ops-infrastructure
│   ├── yak-ops-dao
│   └── yak-ops-common
│
├── 插件体系
│   ├── yak-ops-plugin-spi
│   ├── yak-ops-datasource-plugins
│   ├── yak-ops-engine-*
│   ├── yak-ops-alarm-plugins
│   └── yak-ops-persistence-plugins
│
├── 应用装配
│   ├── yak-ops-boot
│   └── yak-ops-dist
│
├── 前端
│   └── yak-ops-ui
│
└── 依赖管理
    └── yak-ops-bom
```