package io.yak.ops.plugin.task.api;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskPluginDescriptor;
import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import io.yak.ops.spi.workflow.WorkflowTaskPluginFactory;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TaskPluginCatalogTest {

  @Test
  void adaptsExistingWorkflowPluginFactory() {
    WorkflowTaskPluginFactory workflowFactory = new WorkflowTaskPluginFactory() {
      @Override
      public WorkflowTaskPluginDescriptor descriptor() {
        return new WorkflowTaskPluginDescriptor(
            "HTTP", "HTTP 请求", "test", "GENERAL", "1.0.0", true, true,
            Map.of("fields", Map.of("url", Map.of("type", "string"))));
      }

      @Override
      public Map<String, Object> normalize(Map<String, Object> configuration) {
        return Map.of("url", String.valueOf(configuration.get("url")).trim());
      }

      @Override
      public WorkflowTaskExecutor create() {
        return new WorkflowTaskExecutor() {
          @Override public String type() { return "HTTP"; }
          @Override public WorkflowTaskResult execute(WorkflowTaskContext context) {
            return WorkflowTaskResult.succeeded();
          }
        };
      }
    };

    TaskPluginCatalog catalog = new TaskPluginCatalog(List.of(), List.of(workflowFactory));
    Map<String, Object> normalized = catalog.normalizeDefinition(
        "HTTP", Map.of("content", Map.of("kind", "form", "value", Map.of("url", " /api "))));

    assertThat(catalog.types()).containsExactly("HTTP");
    assertThat(catalog.descriptor("HTTP").resultKind()).isEqualTo(TaskPluginFactory.ResultKind.JSON);
    assertThat(normalized.get("taskType")).isEqualTo("HTTP");
    assertThat(normalized.get("config")).isEqualTo(Map.of("url", "/api"));
  }
}
