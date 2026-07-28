package io.yak.ops.common.enums.workflow;

/** 工作流任务执行尝试状态。 */
public enum AttemptState {
  RUNNING,
  SUCCESS,
  FAILED,
  STOPPED,
  INTERRUPTED
}
