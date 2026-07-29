package io.yak.ops.business.sync.realtime.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.realtime.config.ConditionalOnRealtimeSyncEnabled;
import io.yak.ops.business.sync.realtime.model.response.ValidationResult;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/** 对 Flink CDC Pipeline YAML 做提交前结构校验。 */
@ConditionalOnRealtimeSyncEnabled
@Component
public class PipelineDefinitionValidator {

  private final ObjectMapper yamlMapper;

  public PipelineDefinitionValidator(
      @Qualifier("realtimeSyncYamlMapper") ObjectMapper yamlMapper) {
    this.yamlMapper = yamlMapper;
  }

  public ValidationResult validate(String pipelineYaml) {
    List<String> messages = new ArrayList<>();
    if (pipelineYaml == null || pipelineYaml.isBlank()) {
      return ValidationResult.failure(List.of("Pipeline YAML 不能为空"));
    }
    try {
      JsonNode root = yamlMapper.readTree(pipelineYaml);
      requireObject(root, "source", messages);
      requireObject(root, "sink", messages);
      requireObject(root, "pipeline", messages);
      JsonNode pipeline = root.path("pipeline");
      if (pipeline.isObject() && pipeline.path("name").asText("").isBlank()) {
        messages.add("pipeline.name 不能为空");
      }
    } catch (Exception exception) {
      messages.add("Pipeline YAML 解析失败：" + exception.getMessage());
    }
    return messages.isEmpty()
        ? ValidationResult.success()
        : ValidationResult.failure(messages);
  }

  private static void requireObject(JsonNode root, String field, List<String> messages) {
    if (root == null || !root.path(field).isObject()) {
      messages.add(field + " 必须是对象且不能为空");
    }
  }
}
