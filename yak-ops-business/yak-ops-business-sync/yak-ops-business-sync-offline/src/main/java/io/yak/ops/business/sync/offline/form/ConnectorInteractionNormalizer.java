package io.yak.ops.business.sync.offline.form;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.RequiredArgsConstructor;

/**
 * 将 Link-Up Rule 协议转换为前端稳定的交互模型。
 *
 * @author weifuwan
 */
@RequiredArgsConstructor
public final class ConnectorInteractionNormalizer {

  private final ObjectMapper objectMapper;

  public List<ConnectorFormSchema.Interaction> normalize(JsonNode rules) {
    List<ConnectorFormSchema.Interaction> result = new ArrayList<>();
    AtomicInteger sequence = new AtomicInteger(1);
    if (rules == null || !rules.isArray()) {
      return result;
    }
    for (JsonNode rule : rules) {
      appendRule(rule, null, result, sequence);
    }
    return result;
  }

  private void appendRule(JsonNode rule, ConnectorFormSchema.Condition inheritedCondition,
      List<ConnectorFormSchema.Interaction> target, AtomicInteger sequence) {
    if (rule == null || !rule.isObject()) {
      return;
    }
    String type = rule.path("type").asText("").trim().toUpperCase(Locale.ROOT);
    ConnectorFormSchema.Condition ownCondition = condition(rule.path("condition"));
    ConnectorFormSchema.Condition effectiveCondition = combine(inheritedCondition, ownCondition);
    List<String> optionKeys = strings(rule.path("optionKeys"));

    switch (type) {
      case "REQUIRED" -> target.add(interaction(sequence, "REQUIRED", optionKeys,
          inheritedCondition, message(type, optionKeys, null)));
      case "REQUIRED_WHEN" -> target.add(interaction(sequence, "REQUIRED", optionKeys,
          effectiveCondition, message(type, optionKeys, ownCondition)));
      case "EXCLUSIVE" -> target.add(interaction(sequence, "EXCLUSIVE", optionKeys,
          inheritedCondition, message(type, optionKeys, null)));
      case "BUNDLED" -> target.add(interaction(sequence, "BUNDLED", optionKeys,
          inheritedCondition, message(type, optionKeys, null)));
      case "RULE_WHEN" -> target.add(interaction(sequence, "VISIBLE", optionKeys,
          effectiveCondition, message(type, optionKeys, ownCondition)));
      case "CONSTRAINT" -> target.add(interaction(sequence, "VALIDATE", optionKeys,
          effectiveCondition, message(type, optionKeys, ownCondition)));
      default -> {
        if (!type.isEmpty()) {
          target.add(interaction(sequence, "VALIDATE", optionKeys,
              effectiveCondition, "Connector 规则：" + type));
        }
      }
    }

    JsonNode nested = rule.path("nestedRules");
    if (nested.isArray()) {
      ConnectorFormSchema.Condition nestedCondition = "RULE_WHEN".equals(type)
          ? effectiveCondition : inheritedCondition;
      for (JsonNode nestedRule : nested) {
        appendRule(nestedRule, nestedCondition, target, sequence);
      }
    }
  }

  private ConnectorFormSchema.Interaction interaction(AtomicInteger sequence, String effect,
      List<String> optionKeys, ConnectorFormSchema.Condition condition, String message) {
    ConnectorFormSchema.Interaction result = new ConnectorFormSchema.Interaction();
    result.setId("rule-" + sequence.getAndIncrement());
    result.setEffect(effect);
    result.setOptionKeys(optionKeys);
    result.setCondition(copy(condition));
    result.setMessage(message);
    return result;
  }

  private ConnectorFormSchema.Condition condition(JsonNode node) {
    if (node == null || !node.isObject()) {
      return null;
    }
    ConnectorFormSchema.Condition result = new ConnectorFormSchema.Condition();
    result.setOptionKey(text(node, "optionKey"));
    result.setOperator(text(node, "operator"));
    if (node.has("expectedValue") && !node.get("expectedValue").isNull()) {
      result.setExpectedValue(objectMapper.convertValue(node.get("expectedValue"), Object.class));
    }
    result.setCompareOptionKey(text(node, "compareOptionKey"));
    result.setExtensionDescription(text(node, "extensionDescription"));
    result.setLogicalOperator(text(node, "logicalOperator"));
    result.setNext(condition(node.path("next")));
    return result;
  }

  private ConnectorFormSchema.Condition combine(ConnectorFormSchema.Condition left,
      ConnectorFormSchema.Condition right) {
    if (left == null) {
      return copy(right);
    }
    if (right == null) {
      return copy(left);
    }
    ConnectorFormSchema.Condition result = copy(left);
    ConnectorFormSchema.Condition tail = result;
    while (tail.getNext() != null) {
      tail = tail.getNext();
    }
    tail.setLogicalOperator("AND");
    tail.setNext(copy(right));
    return result;
  }

  private ConnectorFormSchema.Condition copy(ConnectorFormSchema.Condition source) {
    if (source == null) {
      return null;
    }
    ConnectorFormSchema.Condition result = new ConnectorFormSchema.Condition();
    result.setOptionKey(source.getOptionKey());
    result.setOperator(source.getOperator());
    result.setExpectedValue(source.getExpectedValue());
    result.setCompareOptionKey(source.getCompareOptionKey());
    result.setExtensionDescription(source.getExtensionDescription());
    result.setLogicalOperator(source.getLogicalOperator());
    result.setNext(copy(source.getNext()));
    return result;
  }

  private String message(String type, List<String> keys, ConnectorFormSchema.Condition condition) {
    if (condition != null && condition.getExtensionDescription() != null
        && !condition.getExtensionDescription().isBlank()) {
      return condition.getExtensionDescription();
    }
    String joined = keys.isEmpty() ? "配置项" : String.join("、", keys);
    return switch (type) {
      case "REQUIRED" -> joined + " 为必填项";
      case "REQUIRED_WHEN" -> "当前条件下需要填写 " + joined;
      case "EXCLUSIVE" -> joined + " 只能选择其中一项";
      case "BUNDLED" -> joined + " 必须同时填写或同时留空";
      case "RULE_WHEN" -> "满足条件时启用 " + joined;
      case "CONSTRAINT" -> joined + " 不满足 Connector 约束";
      default -> "Connector 配置不满足规则";
    };
  }

  private List<String> strings(JsonNode node) {
    List<String> result = new ArrayList<>();
    if (node != null && node.isArray()) {
      for (JsonNode value : node) {
        if (value.isTextual() && !value.asText().isBlank()) {
          result.add(value.asText());
        }
      }
    }
    return result;
  }

  private String text(JsonNode node, String key) {
    JsonNode value = node.get(key);
    return value == null || value.isNull() || value.asText().isBlank() ? null : value.asText();
  }
}
