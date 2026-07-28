package io.yak.ops.business.workflow.common.enums;

/** 工作流实例状态。 */
public enum WorkflowState {
  PENDING,
  RUNNING,
  STOPPING,
  SUCCESS,
  FAILED,
  STOPPED;

  public boolean isTerminal() {
    return this == SUCCESS || this == FAILED || this == STOPPED;
  }
}
