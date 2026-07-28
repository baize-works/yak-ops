package io.yak.ops.business.workflow.model;

/** Shared workflow state and policy enums. */
public final class WorkflowEnums {

  private WorkflowEnums() {
  }

  public enum DefinitionState {
    DRAFT,
    PUBLISHED,
    OFFLINE
  }

  public enum FailureStrategy {
    FAIL_FAST,
    CONTINUE
  }

  public enum TriggerType {
    MANUAL,
    SCHEDULE,
    RECOVERY
  }

  public enum WorkflowState {
    PENDING,
    RUNNING,
    STOPPING,
    SUCCESS,
    FAILED,
    STOPPED;

    public boolean isTerminal() {
      return this == SUCCESS || this == FAILED || this == STOPPED;
    }
  }

  public enum TaskState {
    WAITING,
    READY,
    RUNNING,
    RETRY_WAITING,
    SUCCESS,
    FAILED,
    SKIPPED,
    STOPPED;

    public boolean isTerminal() {
      return this == SUCCESS || this == FAILED || this == SKIPPED || this == STOPPED;
    }

    public boolean satisfiesDependency() {
      return this == SUCCESS || this == SKIPPED;
    }
  }

  public enum AttemptState {
    RUNNING,
    SUCCESS,
    FAILED,
    STOPPED,
    INTERRUPTED
  }

  public enum MisfirePolicy {
    FIRE_NOW,
    DO_NOTHING
  }

  public enum ScheduleConcurrencyPolicy {
    PARALLEL,
    SKIP_IF_RUNNING
  }
}
