package io.yak.ops.business.sync.realtime.util;

import java.util.ArrayList;
import java.util.List;

/** 仅用于 Flink 与 Flink CDC 兼容性判断的宽松语义版本。 */
public final class SemanticVersion implements Comparable<SemanticVersion> {

  private final List<Integer> parts;

  private SemanticVersion(List<Integer> parts) {
    this.parts = parts;
  }

  public static SemanticVersion parse(String value) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException("版本号不能为空");
    }
    String normalized = value.trim();
    int suffix = normalized.indexOf('-');
    if (suffix >= 0) {
      normalized = normalized.substring(0, suffix);
    }
    String[] tokens = normalized.split("\\.");
    List<Integer> parts = new ArrayList<>(tokens.length);
    for (String token : tokens) {
      String digits = token.replaceFirst("^(\\d+).*$", "$1");
      if (!digits.matches("\\d+")) {
        throw new IllegalArgumentException("非法版本号：" + value);
      }
      parts.add(Integer.parseInt(digits));
    }
    return new SemanticVersion(parts);
  }

  public static boolean between(String value, String minimum, String maximum) {
    SemanticVersion current = parse(value);
    return current.compareTo(parse(minimum)) >= 0
        && current.compareTo(parse(maximum)) <= 0;
  }

  @Override
  public int compareTo(SemanticVersion other) {
    int length = Math.max(parts.size(), other.parts.size());
    for (int index = 0; index < length; index++) {
      int left = index < parts.size() ? parts.get(index) : 0;
      int right = index < other.parts.size() ? other.parts.get(index) : 0;
      int compared = Integer.compare(left, right);
      if (compared != 0) {
        return compared;
      }
    }
    return 0;
  }
}
