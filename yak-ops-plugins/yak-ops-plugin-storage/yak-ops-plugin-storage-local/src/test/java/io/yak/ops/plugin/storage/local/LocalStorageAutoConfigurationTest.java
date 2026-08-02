package io.yak.ops.plugin.storage.local;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.common.enums.resource.ResourceStorageType;
import io.yak.ops.spi.storage.StorageOperator;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class LocalStorageAutoConfigurationTest {

  @TempDir
  Path temporaryDirectory;

  @Test
  void shouldRegisterLocalStorageOperatorByDefault() {
    new ApplicationContextRunner()
        .withConfiguration(AutoConfigurations.of(LocalStorageAutoConfiguration.class))
        .withPropertyValues(
            "yak.resource.storage.local.base-directory=" + temporaryDirectory.resolve("resources"))
        .run(context -> {
          assertThat(context).hasSingleBean(StorageOperator.class);
          assertThat(context.getBean(StorageOperator.class).type())
              .isEqualTo(ResourceStorageType.LOCAL);
        });
  }

  @Test
  void shouldAllowLocalStorageToBeDisabled() {
    new ApplicationContextRunner()
        .withConfiguration(AutoConfigurations.of(LocalStorageAutoConfiguration.class))
        .withPropertyValues("yak.resource.storage.local.enabled=false")
        .run(context -> assertThat(context).doesNotHaveBean(StorageOperator.class));
  }
}
