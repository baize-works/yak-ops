package io.yak.ops.plugin.task.all;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.plugin.task.api.TaskPluginCatalog;
import java.util.Set;
import org.junit.jupiter.api.Test;

class TaskPluginAssemblyTest {

  @Test
  void discoversOnlyPhaseOnePlugins() {
    TaskPluginCatalog catalog = new TaskPluginCatalog();

    assertThat(catalog.types()).isEqualTo(Set.of("HTTP", "MYSQL"));
    assertThat(catalog.descriptor("HTTP").name()).isEqualTo("HTTP 请求");
    assertThat(catalog.descriptor("MYSQL").name()).isEqualTo("MySQL");
    assertThat(catalog.descriptor("MYSQL").resultKind().name()).isEqualTo("TABLE");
  }

  @Test
  void createsAttemptScopedExecutorsAndKeepsLegacySqlLookup() {
    TaskPluginCatalog catalog = new TaskPluginCatalog();

    assertThat(catalog.createExecutor("HTTP"))
        .isNotSameAs(catalog.createExecutor("HTTP"));
    assertThat(catalog.createExecutor("MYSQL"))
        .isNotSameAs(catalog.createExecutor("MYSQL"));
    assertThat(catalog.descriptor("SQL").taskType()).isEqualTo("MYSQL");
  }
}
