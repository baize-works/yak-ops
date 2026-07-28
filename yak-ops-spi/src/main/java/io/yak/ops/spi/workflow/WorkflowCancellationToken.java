package io.yak.ops.spi.workflow;

import java.util.concurrent.CancellationException;

/** Cooperative cancellation signal shared between the workflow engine and task plugins. */
@FunctionalInterface
public interface WorkflowCancellationToken {

  boolean isCancellationRequested();

  default void throwIfCancellationRequested() {
    if (isCancellationRequested()) {
      throw new CancellationException("Workflow task execution was cancelled");
    }
  }
}
