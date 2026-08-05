package io.yak.ops.plugin.task.api;

/** Appends one line to the durable task execution log. */
@FunctionalInterface
public interface TaskLogger {

  void log(String line);
}
