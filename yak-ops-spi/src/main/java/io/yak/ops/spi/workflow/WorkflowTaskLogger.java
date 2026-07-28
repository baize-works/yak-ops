package io.yak.ops.spi.workflow;

/** Appends one line to the durable workflow task log. */
@FunctionalInterface
public interface WorkflowTaskLogger {

  void log(String line);
}
