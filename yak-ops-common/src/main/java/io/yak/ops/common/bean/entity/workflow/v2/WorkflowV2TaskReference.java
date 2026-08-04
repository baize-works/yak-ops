package io.yak.ops.common.bean.entity.workflow.v2;

/** Immutable data-development task-version reference used by a Workflow V2 task node. */
public class WorkflowV2TaskReference {

  private String taskId;
  private String taskVersionId;
  private long taskVersionNumber;
  private String taskType;

  public WorkflowV2TaskReference() {
  }

  public WorkflowV2TaskReference(
      String taskId,
      String taskVersionId,
      long taskVersionNumber,
      String taskType) {
    this.taskId = taskId;
    this.taskVersionId = taskVersionId;
    this.taskVersionNumber = taskVersionNumber;
    this.taskType = taskType;
  }

  public String getTaskId() {
    return taskId;
  }

  public void setTaskId(String taskId) {
    this.taskId = taskId;
  }

  public String getTaskVersionId() {
    return taskVersionId;
  }

  public void setTaskVersionId(String taskVersionId) {
    this.taskVersionId = taskVersionId;
  }

  public long getTaskVersionNumber() {
    return taskVersionNumber;
  }

  public void setTaskVersionNumber(long taskVersionNumber) {
    this.taskVersionNumber = taskVersionNumber;
  }

  public String getTaskType() {
    return taskType;
  }

  public void setTaskType(String taskType) {
    this.taskType = taskType;
  }
}
