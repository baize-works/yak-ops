package io.yak.ops.business.workflow.common.enums;

/** 工作流任务执行尝试状态。 */
public enum AttemptState {
  RUNNING,
  SUCCESS,
  FAILED,
  STOPPED,
  INTERRUPTED
}
