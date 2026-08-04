package io.yak.ops.common.bean.entity.workflow.v2;

/** Directed Workflow V2 edge selected from a normalized node outcome port. */
public class WorkflowV2Edge {

  public enum Port {
    SUCCESS,
    FAILURE
  }

  private String from;
  private Port fromPort = Port.SUCCESS;
  private String to;

  public WorkflowV2Edge() {
  }

  public WorkflowV2Edge(String from, Port fromPort, String to) {
    this.from = from;
    setFromPort(fromPort);
    this.to = to;
  }

  public String getFrom() {
    return from;
  }

  public void setFrom(String from) {
    this.from = from;
  }

  public Port getFromPort() {
    return fromPort;
  }

  public void setFromPort(Port fromPort) {
    this.fromPort = fromPort == null ? Port.SUCCESS : fromPort;
  }

  public String getTo() {
    return to;
  }

  public void setTo(String to) {
    this.to = to;
  }
}
