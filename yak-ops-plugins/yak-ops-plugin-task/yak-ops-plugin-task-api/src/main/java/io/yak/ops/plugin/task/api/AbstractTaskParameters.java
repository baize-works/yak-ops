package io.yak.ops.plugin.task.api;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Base parameter object shared by task plugins.
 *
 * <p>It follows the same separation as DolphinScheduler's AbstractParameters: common local
 * parameters live here, while each task plugin owns its typed fields and validation rules.
 */
public abstract class AbstractTaskParameters {

  private final List<TaskLocalParameter> localParams;

  protected AbstractTaskParameters(Map<String, Object> configuration) {
    this.localParams = readLocalParams(configuration);
  }

  public List<TaskLocalParameter> getLocalParams() {
    return Collections.unmodifiableList(localParams);
  }

  protected void validateCommonParameters() {
    for (TaskLocalParameter param : localParams) {
      param.validate();
    }
  }

  protected Map<String, Object> newConfiguration() {
    Map<String, Object> configuration = new LinkedHashMap<>();
    if (localParams.size() > 0) {
      List<Map<String, Object>> paramMaps = new ArrayList<>(localParams.size());
      for (TaskLocalParameter param : localParams) {
        paramMaps.add(param.toMap());
      }
      configuration.put("localParams", paramMaps);
    }
    return configuration;
  }

  public abstract void validate();

  public abstract Map<String, Object> toConfiguration();

  private static List<TaskLocalParameter> readLocalParams(
          Map<String, Object> configuration) {
    Object value = configuration == null ? null : configuration.get("localParams");
    if (value == null) {
      return new ArrayList<>();
    }
    if (!(value instanceof Collection)) {
      throw new IllegalArgumentException("任务配置必须为数组：localParams");
    }

    Collection<?> values = (Collection<?>) value;
    List<TaskLocalParameter> result = new ArrayList<>(values.size());
    for (Object item : values) {
      if (!(item instanceof Map)) {
        throw new IllegalArgumentException("任务局部参数必须为对象");
      }
      Map<?, ?> map = (Map<?, ?>) item;
      result.add(TaskLocalParameter.fromMap(map));
    }
    return result;
  }
}