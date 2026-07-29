package io.yak.ops.common.bean.vo.workflow;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** 工作流任务插件目录信息。 */
public final class WorkflowTaskPluginVO {

  private final String type;
  private final String name;
  private final String description;
  private final String category;
  private final String version;
  private final boolean cancellable;
  private final boolean outputCapable;
  private final Map<String, Object> configurationSchema;

  public WorkflowTaskPluginVO(
      String type,
      String name,
      String description,
      String category,
      String version,
      boolean cancellable,
      boolean outputCapable,
      Map<String, Object> configurationSchema) {
    this.type = type;
    this.name = name;
    this.description = description;
    this.category = category;
    this.version = version;
    this.cancellable = cancellable;
    this.outputCapable = outputCapable;
    this.configurationSchema = configurationSchema == null || configurationSchema.isEmpty()
        ? Map.of()
        : Collections.unmodifiableMap(new LinkedHashMap<>(configurationSchema));
  }

  public String getType() {
    return type;
  }

  public String getName() {
    return name;
  }

  public String getDescription() {
    return description;
  }

  public String getCategory() {
    return category;
  }

  public String getVersion() {
    return version;
  }

  public boolean isCancellable() {
    return cancellable;
  }

  public boolean isOutputCapable() {
    return outputCapable;
  }

  public Map<String, Object> getConfigurationSchema() {
    return configurationSchema;
  }
}
