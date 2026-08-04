package io.yak.ops.common.bean.entity.workflow.v2;

/** Source expression used by Workflow V2 input and end-output mappings. */
public class WorkflowV2BindingSource {

  public enum Type {
    START_INPUT,
    NODE_OUTPUT,
    WORKFLOW_VARIABLE,
    LITERAL
  }

  private Type type;
  private String nodeKey;
  private String path;
  private String variableName;
  private Object literalValue;

  public WorkflowV2BindingSource() {
  }

  public Type getType() {
    return type;
  }

  public void setType(Type type) {
    this.type = type;
  }

  public String getNodeKey() {
    return nodeKey;
  }

  public void setNodeKey(String nodeKey) {
    this.nodeKey = nodeKey;
  }

  public String getPath() {
    return path;
  }

  public void setPath(String path) {
    this.path = path;
  }

  public String getVariableName() {
    return variableName;
  }

  public void setVariableName(String variableName) {
    this.variableName = variableName;
  }

  public Object getLiteralValue() {
    return literalValue;
  }

  public void setLiteralValue(Object literalValue) {
    this.literalValue = literalValue;
  }
}
