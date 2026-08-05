package io.yak.ops.plugin.task.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TaskPluginCatalogTest {

  @Test
  void registersNativeTaskPluginFactory() {
    TaskPluginFactory factory = new TaskPluginFactory() {
      @Override
      public Descriptor descriptor() {
        return new Descriptor(
            "HTTP",
            "HTTP 请求",
            "test",
            "DATA_DEVELOPMENT",
            "1.0.0",
            1,
            new Capabilities(true, true, true, true, true, false, false),
            ResultKind.JSON,
            Map.of(),
            Map.of(),
            Map.of(),
            Map.of());
      }

      @Override
      public Map<String, Object> normalizeDefinition(Map<String, Object> definition) {
        Map<String, Object> normalized = TaskPluginFactory.super.normalizeDefinition(definition);
        normalized.put("config", Map.of("url", "/api"));
        return normalized;
      }

      @Override
      public TaskExecutor createExecutor() {
        return new TaskExecutor() {
          @Override
          public String type() {
            return "HTTP";
          }

          @Override
          public TaskExecutionResult execute(TaskExecutionContext context) {
            return TaskExecutionResult.succeeded();
          }
        };
      }
    };

    TaskPluginCatalog catalog = new TaskPluginCatalog(List.of(factory));
    Map<String, Object> normalized = catalog.normalizeDefinition("HTTP", Map.of());

    assertThat(catalog.types()).containsExactly("HTTP");
    assertThat(catalog.descriptor("HTTP").resultKind())
        .isEqualTo(TaskPluginFactory.ResultKind.JSON);
    assertThat(normalized.get("taskType")).isEqualTo("HTTP");
    assertThat(normalized.get("config")).isEqualTo(Map.of("url", "/api"));
    assertThat(catalog.createExecutor("HTTP").type()).isEqualTo("HTTP");
  }
}
