package io.yak.ops.business.workflow.executor;

import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import org.springframework.stereotype.Component;

/** Lightweight task useful for DAG validation, smoke tests and explicit synchronization points. */
@ConditionalOnWorkflowEnabled
@Component
public final class NoopWorkflowTaskExecutor implements WorkflowTaskExecutor {

  @Override
  public String type() {
    return "NOOP";
  }

  @Override
  public WorkflowTaskResult execute(WorkflowTaskContext context) {
    context.cancellationToken().throwIfCancellationRequested();
    context.logger().log("NOOP task completed");
    return WorkflowTaskResult.succeeded();
  }
}
