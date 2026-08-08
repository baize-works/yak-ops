package io.yak.ops.business.job.task;

import java.util.List;

/** 工作流任务发现边界。 */
public interface TaskRegistry {

  List<TaskDefinition> list();

  TaskDefinition get(String taskId);
}
