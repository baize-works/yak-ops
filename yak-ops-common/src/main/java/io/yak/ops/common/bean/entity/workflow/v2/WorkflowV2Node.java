package io.yak.ops.common.bean.entity.workflow.v2;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** A Workflow V2 control or task-reference node. */
public class WorkflowV2Node {

  public enum Kind {
    START,
    TASK,
    END
  }

  private String key;
  private String name;
  private Kind kind;
  private String description;
  private Double positionX;
  private Double positionY;
  private boolean enabled = true;
  private WorkflowV2TaskReference taskRef;
  private List<WorkflowV2InputBinding> inputBindings = new ArrayList<>();
  private Map<String, WorkflowV2BindingSource> outputBindings = new LinkedHashMap<>();
  private WorkflowV2ExecutionPolicy executionPolicy = new WorkflowV2ExecutionPolicy();

  public WorkflowV2Node() {
  }

  public String getKey() {
    return key;
  }

  public void setKey(String key) {
    this.key = key;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public Kind getKind() {
    return kind;
  }

  public void setKind(Kind kind) {
    this.kind = kind;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public Double getPositionX() {
    return positionX;
  }

  public void setPositionX(Double positionX) {
    this.positionX = positionX;
  }

  public Double getPositionY() {
    return positionY;
  }

  public void setPositionY(Double positionY) {
    this.positionY = positionY;
  }

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public WorkflowV2TaskReference getTaskRef() {
    return taskRef;
  }

  public void setTaskRef(WorkflowV2TaskReference taskRef) {
    this.taskRef = taskRef;
  }

  public List<WorkflowV2InputBinding> getInputBindings() {
    return inputBindings;
  }

  public void setInputBindings(List<WorkflowV2InputBinding> inputBindings) {
    this.inputBindings = inputBindings == null ? new ArrayList<>() : new ArrayList<>(inputBindings);
  }

  public Map<String, WorkflowV2BindingSource> getOutputBindings() {
    return outputBindings;
  }

  public void setOutputBindings(Map<String, WorkflowV2BindingSource> outputBindings) {
    this.outputBindings = outputBindings == null
        ? new LinkedHashMap<>()
        : new LinkedHashMap<>(outputBindings);
  }

  public WorkflowV2ExecutionPolicy getExecutionPolicy() {
    return executionPolicy;
  }

  public void setExecutionPolicy(WorkflowV2ExecutionPolicy executionPolicy) {
    this.executionPolicy = executionPolicy == null
        ? new WorkflowV2ExecutionPolicy()
        : executionPolicy;
  }
}
