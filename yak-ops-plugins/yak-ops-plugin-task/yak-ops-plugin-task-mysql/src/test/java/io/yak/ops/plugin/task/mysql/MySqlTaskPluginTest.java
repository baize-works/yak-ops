package io.yak.ops.plugin.task.mysql;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.yak.ops.plugin.task.api.TaskPluginFactory;
import java.util.Map;
import org.junit.jupiter.api.Test;

class MySqlTaskPluginTest {

  private final TaskPluginFactory factory = new MySqlTaskPluginFactory();

  @Test
  void exposesMySqlAsThePublicTaskType() {
    assertThat(factory.descriptor().taskType()).isEqualTo("MYSQL");
    assertThat(factory.descriptor().name()).isEqualTo("MySQL");
    assertThat(factory.createExecutor().type()).isEqualTo("MYSQL");
  }

  @Test
  void rejectsNonMySqlJdbcUrls() {
    Map<String, Object> definition = factory.defaultDefinition();
    @SuppressWarnings("unchecked")
    Map<String, Object> config = (Map<String, Object>) definition.get("config");
    config = new java.util.LinkedHashMap<>(config);
    config.put("jdbcUrl", "jdbc:postgresql://127.0.0.1:5432/test");
    definition = new java.util.LinkedHashMap<>(definition);
    definition.put("config", config);

    Map<String, Object> invalidDefinition = definition;
    assertThatThrownBy(() -> factory.validateDefinition(invalidDefinition))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("jdbc:mysql:");
  }
}
