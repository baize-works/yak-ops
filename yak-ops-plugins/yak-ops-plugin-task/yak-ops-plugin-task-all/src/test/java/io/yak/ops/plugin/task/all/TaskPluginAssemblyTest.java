package io.yak.ops.plugin.task.all;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.plugin.task.api.TaskPluginCatalog;
import java.util.Set;
import org.junit.jupiter.api.Test;

class TaskPluginAssemblyTest {

  @Test
  void discoversOnlyPhaseOnePlugins() {
    TaskPluginCatalog catalog = new TaskPluginCatalog();

    assertThat(catalog.types()).isEqualTo(Set.of("HTTP", "SQL"));
    assertThat(catalog.descriptor("HTTP").name()).isEqualTo("HTTP 请求");
    assertThat(catalog.descriptor("SQL").resultKind().name()).isEqualTo("TABLE");
  }

  @Test
  void createsAttemptScopedExecutors() {
    TaskPluginCatalog catalog = new TaskPluginCatalog();

    assertThat(catalog.createExecutor("HTTP"))
        .isNotSameAs(catalog.createExecutor("HTTP"));
    assertThat(catalog.createExecutor("SQL"))
        .isNotSameAs(catalog.createExecutor("SQL"));
  }
}
