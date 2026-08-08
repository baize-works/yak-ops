package io.yak.ops.business.job.task;

/** 工作流调用现有数据同步执行链路的最小适配边界。 */
public interface SyncTaskRunner {

  SyncTaskExecution start(String taskId);

  SyncTaskExecution status(String executionId);

  void cancel(String executionId);
}
