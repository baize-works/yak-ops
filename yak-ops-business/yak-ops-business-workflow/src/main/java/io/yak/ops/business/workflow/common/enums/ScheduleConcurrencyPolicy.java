package io.yak.ops.business.workflow.common.enums;

/** 工作流调度并发策略。 */
public enum ScheduleConcurrencyPolicy {
  PARALLEL,
  SKIP_IF_RUNNING
}
