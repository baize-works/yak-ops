package io.yak.ops.business.workflow.service;

import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Periodically restores persisted non-terminal instances after process restarts or missed callbacks. */
@ConditionalOnWorkflowEnabled
@Component
public final class WorkflowRecoveryScanner {

  private final WorkflowEngine engine;

  public WorkflowRecoveryScanner(WorkflowEngine engine) {
    this.engine = engine;
  }

  @Scheduled(
      initialDelayString = "${yak.workflow.recovery.initial-delay-millis:5000}",
      fixedDelayString = "${yak.workflow.recovery.fixed-delay-millis:10000}")
  public void recover() {
    engine.recover();
  }
}
