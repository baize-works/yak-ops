package io.yak.ops.plugin.task.api;

import java.util.*;

/** 任务插件配置读取工具，统一处理必填、类型转换和边界校验。 */
public final class TaskConfiguration {

  private TaskConfiguration() {
  }

  public static String requiredString(Map<String, Object> configuration, String key) {
    String value = string(configuration, key, null);
    if (!hasText(value)) {
      throw new IllegalArgumentException("任务配置不能为空：" + key);
    }
    return value.trim();
  }

  public static String string(
      Map<String, Object> configuration,
      String key,
      String fallback) {
    Object value = value(configuration, key);
    return value == null ? fallback : String.valueOf(value);
  }

  public static int positiveInteger(
      Map<String, Object> configuration,
      String key,
      int fallback) {
    Object value = value(configuration, key);
    int parsed;
    try {
      parsed = value == null ? fallback : Integer.parseInt(String.valueOf(value));
    } catch (NumberFormatException error) {
      throw new IllegalArgumentException("任务配置必须为整数：" + key, error);
    }
    if (parsed <= 0) {
      throw new IllegalArgumentException("任务配置必须大于 0：" + key);
    }
    return parsed;
  }

  public static Map<String, String> stringMap(
          Map<String, Object> configuration,
          String key) {
    Object value = value(configuration, key);
    if (value == null) {
      return Collections.emptyMap();
    }
    if (!(value instanceof Map<?, ?>)) {
      throw new IllegalArgumentException("任务配置必须为对象：" + key);
    }
    Map<?, ?> source = (Map<?, ?>) value;
    Map<String, String> result = new LinkedHashMap<>();
    source.forEach((entryKey, entryValue) -> result.put(
            String.valueOf(entryKey),
            entryValue == null ? "" : String.valueOf(entryValue)));
    return result;
  }

  public static List<String> stringList(
          Map<String, Object> configuration,
          String key) {
    Object value = value(configuration, key);
    if (value == null) {
      return Collections.emptyList();
    }
    if (!(value instanceof Collection<?>)) {
      throw new IllegalArgumentException("任务配置必须为数组：" + key);
    }
    Collection<?> source = (Collection<?>) value;
    List<String> result = new ArrayList<>(source.size());
    for (Object item : source) {
      result.add(String.valueOf(item));
    }
    return result;
  }

  public static Set<Integer> integerSet(
          Map<String, Object> configuration,
          String key,
          Set<Integer> fallback) {
    Object value = value(configuration, key);
    if (value == null) {
      return fallback;
    }
    if (!(value instanceof Collection<?>)) {
      throw new IllegalArgumentException("任务配置必须为非空整数数组：" + key);
    }
    Collection<?> source = (Collection<?>) value;
    if (source.isEmpty()) {
      throw new IllegalArgumentException("任务配置必须为非空整数数组：" + key);
    }
    Set<Integer> result = new LinkedHashSet<>();
    try {
      for (Object item : source) {
        result.add(Integer.parseInt(String.valueOf(item)));
      }
    } catch (NumberFormatException error) {
      throw new IllegalArgumentException("任务配置必须为整数数组：" + key, error);
    }
    return result;
  }

  public static boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  private static Object value(Map<String, Object> configuration, String key) {
    return configuration == null ? null : configuration.get(key);
  }
}
