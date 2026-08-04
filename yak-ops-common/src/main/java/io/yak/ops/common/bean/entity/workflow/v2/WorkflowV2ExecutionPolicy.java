package io.yak.ops.common.bean.entity.workflow.v2;

/** Orchestration-only execution policy for one Workflow V2 task node. */
public class WorkflowV2ExecutionPolicy {

  public enum FailureAction {
    FAIL_WORKFLOW,
    ROUTE_FAILURE,
    PAUSE
  }

  private int timeoutSeconds;
  private int retryTimes;
  private int retryIntervalSeconds;
  private FailureAction failureAction = FailureAction.FAIL_WORKFLOW;

  public WorkflowV2ExecutionPolicy() {
  }

  public int getTimeoutSeconds() {
    return timeoutSeconds;
  }

  public void setTimeoutSeconds(int timeoutSeconds) {
    this.timeoutSeconds = timeoutSeconds;
  }

  public int getRetryTimes() {
    return retryTimes;
  }

  public void setRetryTimes(int retryTimes) {
    this.retryTimes = retryTimes;
  }

  public int getRetryIntervalSeconds() {
    return retryIntervalSeconds;
  }

  public void setRetryIntervalSeconds(int retryIntervalSeconds) {
    this.retryIntervalSeconds = retryIntervalSeconds;
  }

  public FailureAction getFailureAction() {
    return failureAction;
  }

  public void setFailureAction(FailureAction failureAction) {
    this.failureAction = failureAction == null ? FailureAction.FAIL_WORKFLOW : failureAction;
  }
}
