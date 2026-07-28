package io.yak.ops.common.bean.entity.workflow;

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 工作流 DAG 节点。 */
@Data
@NoArgsConstructor
public class WorkflowNode {

  private String key;
  private String name;
  private String type;
  private String description;
  private Double positionX;
  private Double positionY;
  private Map<String, Object> config = new LinkedHashMap<>();
  private int retryTimes;
  private int retryIntervalSeconds;
  private int timeoutSeconds;
  private boolean enabled = true;
  private boolean idempotent;
  private boolean retryOnRestart;

  /** 保留原有构造方式，兼容已有测试与调用代码。 */
  public WorkflowNode(
      String key,
      String name,
      String type,
      Map<String, Object> config,
      int retryTimes,
      int retryIntervalSeconds,
      int timeoutSeconds,
      boolean enabled,
      boolean idempotent,
      boolean retryOnRestart) {
    this.key = key;
    this.name = name;
    this.type = type;
    setConfig(config);
    this.retryTimes = retryTimes;
    this.retryIntervalSeconds = retryIntervalSeconds;
    this.timeoutSeconds = timeoutSeconds;
    this.enabled = enabled;
    this.idempotent = idempotent;
    this.retryOnRestart = retryOnRestart;
  }

  public void setConfig(Map<String, Object> config) {
    this.config = config == null ? new LinkedHashMap<>() : new LinkedHashMap<>(config);
  }
}
