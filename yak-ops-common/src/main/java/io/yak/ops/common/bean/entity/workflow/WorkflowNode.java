package io.yak.ops.common.bean.entity.workflow;

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 工作流 DAG 节点。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowNode {

  private String key;
  private String name;
  private String type;
  private Map<String, Object> config = new LinkedHashMap<>();
  private int retryTimes;
  private int retryIntervalSeconds;
  private int timeoutSeconds;
  private boolean enabled = true;
  private boolean idempotent;
  private boolean retryOnRestart;

  public void setConfig(Map<String, Object> config) {
    this.config = config == null ? new LinkedHashMap<>() : new LinkedHashMap<>(config);
  }
}
