package io.yak.ops.business.workflow.engine;

import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** 定期恢复数据库中未结束的工作流实例。 */
@ConditionalOnWorkflowEnabled
@ConditionalOnProperty(
    prefix = "yak.workflow.recovery",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true)
@Component
public class WorkflowRecoveryScanner {

  private final WorkflowEngine workflowEngine;

  public WorkflowRecoveryScanner(WorkflowEngine workflowEngine) {
    this.workflowEngine = workflowEngine;
  }

  @Scheduled(
      initialDelayString = "${yak.workflow.recovery.initial-delay-millis:5000}",
      fixedDelayString = "${yak.workflow.recovery.fixed-delay-millis:10000}")
  public void recover() {
    workflowEngine.recover();
  }
}
