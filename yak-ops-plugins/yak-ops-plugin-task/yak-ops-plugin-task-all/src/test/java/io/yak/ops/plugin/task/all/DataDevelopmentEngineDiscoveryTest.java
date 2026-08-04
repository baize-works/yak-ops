package io.yak.ops.plugin.task.all;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.core.workflow.WorkflowTaskExecutorRegistry;
import io.yak.ops.plugin.task.api.TaskPluginCatalog;
import java.util.List;
import org.junit.jupiter.api.Test;

class DataDevelopmentEngineDiscoveryTest {

  @Test
  void shouldDiscoverAuthoringAndExecutionFactories() {
    TaskPluginCatalog authoring = new TaskPluginCatalog();
    WorkflowTaskExecutorRegistry execution = new WorkflowTaskExecutorRegistry(List.of());

    assertThat(authoring.types())
        .contains("HTTP", "SHELL", "SQL", "FLINK_SQL", "PYTHON", "NOTEBOOK");
    assertThat(execution.types())
        .contains("HTTP", "SHELL", "SQL", "FLINK_SQL", "PYTHON", "NOTEBOOK");

    assertThat(authoring.defaultDefinition("SQL").get("content")).isNotNull();
    assertThat(authoring.defaultDefinition("PYTHON").get("content")).isNotNull();
    assertThat(authoring.defaultDefinition("NOTEBOOK").get("content")).isNotNull();
  }
}
