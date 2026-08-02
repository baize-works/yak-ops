package io.yak.ops.plugin.storage.local;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.yak.ops.spi.storage.StorageObjectMetadata;
import io.yak.ops.spi.storage.StoragePluginException;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalStorageOperatorTest {

  @TempDir
  Path temporaryDirectory;

  private LocalStorageOperator operator;

  @BeforeEach
  void setUp() {
    LocalStorageProperties properties = new LocalStorageProperties();
    properties.setBaseDirectory(temporaryDirectory.resolve("resources").toString());
    operator = new LocalStorageOperator(properties);
  }

  @Test
  void shouldUploadDownloadAndReadMetadata() throws Exception {
    byte[] content = "hello yak ops".getBytes(StandardCharsets.UTF_8);

    operator.createDirectory("documents");
    operator.upload(
        "documents/readme.txt",
        new ByteArrayInputStream(content),
        content.length,
        "text/plain",
        false);

    assertThat(operator.exists("documents/readme.txt")).isTrue();
    try (InputStream inputStream = operator.download("documents/readme.txt")) {
      assertThat(inputStream.readAllBytes()).isEqualTo(content);
    }

    StorageObjectMetadata metadata = operator.metadata("documents/readme.txt");
    assertThat(metadata.isDirectory()).isFalse();
    assertThat(metadata.getSize()).isEqualTo(content.length);
    assertThat(metadata.getChecksum())
        .isEqualTo("2c4e1d1a1e3dc0b29f7736182a3489a7bc8c6cb77032afaed2736b28c0e9eb64");
    assertThat(metadata.getLastModified()).isNotNull();
  }

  @Test
  void shouldMoveDirectoryAndDeleteRecursively() {
    byte[] content = "content".getBytes(StandardCharsets.UTF_8);
    operator.createDirectory("source/nested");
    operator.upload(
        "source/nested/data.txt",
        new ByteArrayInputStream(content),
        content.length,
        "text/plain",
        false);

    operator.move("source", "archive", false);

    assertThat(operator.exists("source")).isFalse();
    assertThat(operator.exists("archive/nested/data.txt")).isTrue();

    operator.delete("archive", true);
    assertThat(operator.exists("archive")).isFalse();
  }

  @Test
  void shouldHonorOverwriteAndDeclaredSize() throws Exception {
    byte[] first = "first".getBytes(StandardCharsets.UTF_8);
    byte[] second = "second".getBytes(StandardCharsets.UTF_8);
    operator.upload("file.txt", new ByteArrayInputStream(first), first.length, "text/plain", false);

    assertThatThrownBy(() -> operator.upload(
        "file.txt",
        new ByteArrayInputStream(second),
        second.length,
        "text/plain",
        false))
        .isInstanceOf(StoragePluginException.class)
        .hasMessageContaining("已存在");

    operator.upload(
        "file.txt",
        new ByteArrayInputStream(second),
        second.length,
        "text/plain",
        true);
    try (InputStream inputStream = operator.download("file.txt")) {
      assertThat(inputStream.readAllBytes()).isEqualTo(second);
    }

    assertThatThrownBy(() -> operator.upload(
        "invalid.txt",
        new ByteArrayInputStream(second),
        1L,
        "text/plain",
        false))
        .isInstanceOf(StoragePluginException.class)
        .hasMessageContaining("大小不一致");
    assertThat(operator.exists("invalid.txt")).isFalse();
  }

  @Test
  void shouldRejectUnsafePaths() {
    assertThatThrownBy(() -> operator.exists("../outside.txt"))
        .isInstanceOf(StoragePluginException.class)
        .hasMessageContaining("上级目录");
    assertThatThrownBy(() -> operator.exists("folder/./file.txt"))
        .isInstanceOf(StoragePluginException.class)
        .hasMessageContaining("当前或上级目录");
    assertThatThrownBy(() -> operator.move("missing", "target", false))
        .isInstanceOf(StoragePluginException.class)
        .hasMessageContaining("不存在");
  }
}
