package io.yak.ops.common.bean.entity.workflow.v2;

/** Maps one task input path to a workflow-visible source. */
public class WorkflowV2InputBinding {

  private String target;
  private WorkflowV2BindingSource source;

  public WorkflowV2InputBinding() {
  }

  public WorkflowV2InputBinding(String target, WorkflowV2BindingSource source) {
    this.target = target;
    this.source = source;
  }

  public String getTarget() {
    return target;
  }

  public void setTarget(String target) {
    this.target = target;
  }

  public WorkflowV2BindingSource getSource() {
    return source;
  }

  public void setSource(WorkflowV2BindingSource source) {
    this.source = source;
  }
}
