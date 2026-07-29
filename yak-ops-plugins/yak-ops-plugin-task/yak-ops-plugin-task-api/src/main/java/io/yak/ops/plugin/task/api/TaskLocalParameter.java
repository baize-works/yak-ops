package io.yak.ops.plugin.task.api;

import java.util.LinkedHashMap;
import java.util.Map;

/** Common local input/output parameter shared by all task parameter objects. */
public final class TaskLocalParameter {

  private final String prop;
  private final String direct;
  private final String type;
  private final String value;

  public TaskLocalParameter(String prop, String direct, String type, String value) {
    this.prop = prop == null ? "" : prop.trim();
    this.direct = direct == null ? "IN" : direct.trim().toUpperCase();
    this.type = type == null ? "VARCHAR" : type.trim().toUpperCase();
    this.value = value == null ? "" : value;
  }

  public static TaskLocalParameter fromMap(Map<?, ?> source) {
    return new TaskLocalParameter(
        text(source.get("prop")),
        text(source.get("direct")),
        text(source.get("type")),
        text(source.get("value")));
  }

  public void validate() {
    if (!TaskConfiguration.hasText(prop)) {
      throw new IllegalArgumentException("任务局部参数名称不能为空");
    }
    if (!"IN".equals(direct) && !"OUT".equals(direct)) {
      throw new IllegalArgumentException("任务局部参数方向只能为 IN 或 OUT：" + prop);
    }
  }

  public Map<String, Object> toMap() {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("prop", prop);
    result.put("direct", direct);
    result.put("type", type);
    result.put("value", value);
    return result;
  }

  public String getProp() {
    return prop;
  }

  public String getDirect() {
    return direct;
  }

  public String getType() {
    return type;
  }

  public String getValue() {
    return value;
  }

  private static String text(Object value) {
    return value == null ? null : String.valueOf(value);
  }
}
