package io.yak.ops.business.workflow.common.enums;

/** 工作流任务实例状态。 */
public enum TaskState {
  WAITING,
  READY,
  RUNNING,
  RETRY_WAITING,
  SUCCESS,
  FAILED,
  SKIPPED,
  STOPPED;

  public boolean isTerminal() {
    return this == SUCCESS || this == FAILED || this == SKIPPED || this == STOPPED;
  }

  public boolean satisfiesDependency() {
    return this == SUCCESS || this == SKIPPED;
  }
}
