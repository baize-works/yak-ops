package io.yak.ops.business.sync.offline.form;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * Yak Ops 后端和前端遵循的条件求值语义。
 *
 * @author weifuwan
 */
public final class ConnectorConditionEvaluator {

  public boolean evaluate(ConnectorFormSchema.Condition condition, Map<String, Object> values) {
    if (condition == null) {
      return true;
    }
    boolean current = evaluateSingle(condition, values);
    if (condition.getNext() == null) {
      return current;
    }
    boolean next = evaluate(condition.getNext(), values);
    String logical = normalize(condition.getLogicalOperator());
    return "OR".equals(logical) ? current || next : current && next;
  }

  private boolean evaluateSingle(ConnectorFormSchema.Condition condition, Map<String, Object> values) {
    Object actual = values.get(condition.getOptionKey());
    Object expected = condition.getCompareOptionKey() == null
        ? condition.getExpectedValue() : values.get(condition.getCompareOptionKey());
    String operator = normalize(condition.getOperator());
    return switch (operator) {
      case "EQ", "EQUAL", "EQUALS", "IS" -> equalsValue(actual, expected);
      case "NE", "NOT_EQUAL", "NOT_EQUALS", "IS_NOT" -> !equalsValue(actual, expected);
      case "IN" -> contains(expected, actual);
      case "NOT_IN" -> !contains(expected, actual);
      case "CONTAINS" -> contains(actual, expected);
      case "NOT_CONTAINS" -> !contains(actual, expected);
      case "EXISTS", "PRESENT", "NOT_EMPTY" -> !isEmpty(actual);
      case "NOT_EXISTS", "ABSENT", "EMPTY" -> isEmpty(actual);
      case "TRUE", "IS_TRUE" -> Boolean.TRUE.equals(booleanValue(actual));
      case "FALSE", "IS_FALSE" -> Boolean.FALSE.equals(booleanValue(actual));
      case "GT", "GREATER_THAN" -> compare(actual, expected) > 0;
      case "GTE", "GREATER_THAN_OR_EQUAL" -> compare(actual, expected) >= 0;
      case "LT", "LESS_THAN" -> compare(actual, expected) < 0;
      case "LTE", "LESS_THAN_OR_EQUAL" -> compare(actual, expected) <= 0;
      case "STARTS_WITH" -> string(actual).startsWith(string(expected));
      case "ENDS_WITH" -> string(actual).endsWith(string(expected));
      case "MATCHES", "REGEX" -> matches(actual, expected);
      case "EXTENSION", "" -> true;
      default -> true;
    };
  }

  public boolean isEmpty(Object value) {
    if (value == null) { return true; }
    if (value instanceof CharSequence text) { return text.toString().trim().isEmpty(); }
    if (value instanceof Collection<?> collection) { return collection.isEmpty(); }
    if (value instanceof Map<?, ?> map) { return map.isEmpty(); }
    return false;
  }

  private boolean equalsValue(Object left, Object right) {
    if (left instanceof Collection<?> collection) {
      return collection.stream().anyMatch(item -> equalsValue(item, right));
    }
    if (right instanceof Collection<?> collection) {
      return collection.stream().anyMatch(item -> equalsValue(left, item));
    }
    if (left instanceof Number || right instanceof Number) {
      try {
        return decimal(left).compareTo(decimal(right)) == 0;
      } catch (RuntimeException ignored) {
        return Objects.equals(string(left), string(right));
      }
    }
    return Objects.equals(left, right) || string(left).equalsIgnoreCase(string(right));
  }

  private boolean contains(Object container, Object value) {
    if (container instanceof Collection<?> collection) {
      return collection.stream().anyMatch(item -> equalsValue(item, value));
    }
    if (container instanceof Map<?, ?> map) {
      return map.containsKey(value) || map.containsValue(value);
    }
    return string(container).contains(string(value));
  }

  private int compare(Object left, Object right) {
    try {
      return decimal(left).compareTo(decimal(right));
    } catch (RuntimeException ignored) {
      return string(left).compareTo(string(right));
    }
  }

  private BigDecimal decimal(Object value) {
    return new BigDecimal(string(value));
  }

  private Boolean booleanValue(Object value) {
    if (value instanceof Boolean bool) { return bool; }
    String text = string(value);
    if (List.of("true", "1", "yes", "on").contains(text.toLowerCase(Locale.ROOT))) {
      return true;
    }
    if (List.of("false", "0", "no", "off").contains(text.toLowerCase(Locale.ROOT))) {
      return false;
    }
    return null;
  }

  private boolean matches(Object actual, Object expected) {
    try {
      return Pattern.compile(string(expected)).matcher(string(actual)).matches();
    } catch (PatternSyntaxException ignored) {
      return true;
    }
  }

  private String string(Object value) {
    return value == null ? "" : String.valueOf(value).trim();
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim().toUpperCase(Locale.ROOT).replace('-', '_');
  }
}
