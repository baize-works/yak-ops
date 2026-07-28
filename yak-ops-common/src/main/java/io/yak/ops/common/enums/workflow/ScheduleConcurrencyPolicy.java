package io.yak.ops.common.enums.workflow;

/** 工作流调度并发策略。 */
public enum ScheduleConcurrencyPolicy {
  PARALLEL,
  SKIP_IF_RUNNING
}
