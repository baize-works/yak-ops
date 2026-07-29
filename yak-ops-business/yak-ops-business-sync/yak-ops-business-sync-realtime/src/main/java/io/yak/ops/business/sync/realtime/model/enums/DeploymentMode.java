package io.yak.ops.business.sync.realtime.model.enums;

/** Flink CDC 部署目标。 */
public enum DeploymentMode {
  STANDALONE,
  YARN_SESSION,
  YARN_APPLICATION,
  KUBERNETES_SESSION,
  KUBERNETES_OPERATOR;

  public boolean isOperator() {
    return this == KUBERNETES_OPERATOR;
  }
}
