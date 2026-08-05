package io.yak.ops.plugin.task.api;

import java.util.concurrent.CancellationException;

/** Cooperative cancellation signal shared by the execution gateway and task plugins. */
@FunctionalInterface
public interface TaskCancellationToken {

  boolean isCancellationRequested();

  default void throwIfCancellationRequested() {
    if (isCancellationRequested()) {
      throw new CancellationException("Task execution was cancelled");
    }
  }
}
