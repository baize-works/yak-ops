# Yak Ops Realtime Sync

该模块负责 Flink CDC 3.x 实时同步任务的后端领域能力，核心边界如下：

- Flink CDC 多版本目录与默认版本管理；
- Flink 运行环境管理与版本兼容性校验；
- Pipeline YAML 任务定义、提交前校验与运行参数管理；
- Standalone、YARN Session、YARN Application、Kubernetes Session 和 Kubernetes Operator 部署适配器；
- 每次提交、取消、状态查询与 Savepoint 的部署历史记录；
- 通过 `FlinkCdcDeploymentGateway` 扩展新的部署目标，业务服务不感知底层提交细节。

## 关键配置

```yaml
yak:
  sync:
    realtime:
      enabled: true
      work-directory: /data/yak-ops/realtime-sync
      process-timeout: 5m
      kubectl-command: kubectl
      yarn-command: yarn
      datasource:
        url: jdbc:mariadb://127.0.0.1:3306/yak_security
        username: root
        password: 123456
```

运行环境的 `deploymentConfig` 约定：

- `flink.<key>`：提交时转换为 `-D<key>=<value>`；
- `env.<KEY>`：注入到外部进程环境变量；
- Kubernetes Operator：至少配置 `image` 与 `flinkVersion`，可选 `serviceAccount`、`kubeConfig`、`upgradeMode`、资源规格等。
