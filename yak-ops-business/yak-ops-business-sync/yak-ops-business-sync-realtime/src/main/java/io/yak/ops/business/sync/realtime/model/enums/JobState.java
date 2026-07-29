package io.yak.ops.business.sync.realtime.model.enums;

/** 实时同步任务状态。 */
public enum JobState {
  DRAFT,
  VALIDATED,
  SUBMITTING,
  RUNNING,
  STOPPED,
  FINISHED,
  FAILED;

  public boolean isRunning() {
    return this == SUBMITTING || this == RUNNING;
  }
}
