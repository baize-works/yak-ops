package io.yak.ops.business.resource.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.yak.ops.business.resource.config.ResourceProperties;
import io.yak.ops.business.resource.exception.ResourceException;
import io.yak.ops.common.enums.resource.ResourceStorageType;
import io.yak.ops.spi.storage.StorageObjectMetadata;
import io.yak.ops.spi.storage.StorageOperator;
import java.io.InputStream;
import java.util.List;
import org.junit.jupiter.api.Test;

class StorageOperatorRegistryTest {

  @Test
  void resolvesConfiguredDefaultAndListsInstalledPlugins() {
    ResourceProperties properties = new ResourceProperties();
    StorageOperator minio = new StubOperator(ResourceStorageType.MINIO, "MinIO");
    StorageOperatorRegistry registry = new StorageOperatorRegistry(List.of(minio), properties);

    assertThat(registry.require(null)).isSameAs(minio);
    assertThat(registry.list()).singleElement().satisfies(plugin -> {
      assertThat(plugin.getType()).isEqualTo(ResourceStorageType.MINIO);
      assertThat(plugin.isActive()).isTrue();
    });
  }

  @Test
  void rejectsMissingConfiguredPlugin() {
    ResourceProperties properties = new ResourceProperties();
    properties.getStorage().setType(ResourceStorageType.HDFS);
    StorageOperatorRegistry registry = new StorageOperatorRegistry(List.of(), properties);

    assertThatThrownBy(() -> registry.require(null))
        .isInstanceOf(ResourceException.class);
  }

  private static final class StubOperator implements StorageOperator {

    private final ResourceStorageType type;
    private final String name;

    private StubOperator(ResourceStorageType type, String name) {
      this.type = type;
      this.name = name;
    }

    @Override
    public ResourceStorageType type() {
      return type;
    }

    @Override
    public String name() {
      return name;
    }

    @Override
    public void createDirectory(String path) {
    }

    @Override
    public boolean exists(String path) {
      return false;
    }

    @Override
    public void upload(
        String path,
        InputStream inputStream,
        long size,
        String contentType,
        boolean overwrite) {
    }

    @Override
    public InputStream download(String path) {
      throw new UnsupportedOperationException();
    }

    @Override
    public void delete(String path, boolean recursive) {
    }

    @Override
    public void move(String sourcePath, String targetPath, boolean overwrite) {
    }

    @Override
    public StorageObjectMetadata metadata(String path) {
      throw new UnsupportedOperationException();
    }
  }
}
