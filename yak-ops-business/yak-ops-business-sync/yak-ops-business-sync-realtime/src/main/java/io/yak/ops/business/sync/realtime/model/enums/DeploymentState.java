package io.yak.ops.business.sync.realtime.model.enums;

/** 单次部署状态。 */
public enum DeploymentState {
  CREATED,
  SUBMITTING,
  RUNNING,
  CANCELLING,
  CANCELLED,
  FINISHED,
  FAILED,
  UNKNOWN
}
