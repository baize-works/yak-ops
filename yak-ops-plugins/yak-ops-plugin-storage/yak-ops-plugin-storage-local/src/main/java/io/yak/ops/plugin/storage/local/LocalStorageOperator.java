package io.yak.ops.plugin.storage.local;

import io.yak.ops.common.enums.resource.ResourceStorageType;
import io.yak.ops.spi.storage.StorageObjectMetadata;
import io.yak.ops.spi.storage.StorageOperator;
import io.yak.ops.spi.storage.StoragePluginException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.DirectoryNotEmptyException;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.LinkOption;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Objects;

/** 基于应用节点磁盘的内置资源存储实现。 */
public class LocalStorageOperator implements StorageOperator {

  private static final int BUFFER_SIZE = 8192;
  private static final String INTERNAL_DIRECTORY = ".yak-storage";
  private static final String STAGING_DIRECTORY = "staging";

  private final LocalStorageProperties properties;
  private final Path baseDirectory;
  private final Path stagingDirectory;

  public LocalStorageOperator(LocalStorageProperties properties) {
    this.properties = Objects.requireNonNull(properties, "本地存储配置不能为空");
    this.baseDirectory = initializeBaseDirectory(properties.getBaseDirectory());
    this.stagingDirectory = initializeStagingDirectory();
  }

  @Override
  public ResourceStorageType type() {
    return ResourceStorageType.LOCAL;
  }

  @Override
  public String name() {
    return "本地存储";
  }

  @Override
  public void createDirectory(String path) {
    Path target = resolve(path);
    try {
      if (Files.exists(target, LinkOption.NOFOLLOW_LINKS)) {
        throw new StoragePluginException("本地目录已存在：" + path);
      }
      Files.createDirectories(target);
      ensureNoSymbolicLink(target);
    } catch (StoragePluginException exception) {
      throw exception;
    } catch (IOException exception) {
      throw pluginException("创建本地目录失败：" + path, exception);
    }
  }

  @Override
  public boolean exists(String path) {
    return Files.exists(resolve(path), LinkOption.NOFOLLOW_LINKS);
  }

  @Override
  public void upload(
      String path,
      InputStream inputStream,
      long size,
      String contentType,
      boolean overwrite) {
    Objects.requireNonNull(inputStream, "上传文件流不能为空");
    if (size < 0L) {
      throw new StoragePluginException("上传文件大小不能为负数：" + size);
    }

    Path target = resolve(path);
    Path temporary = null;
    try {
      Path parent = target.getParent();
      if (parent == null) {
        throw new StoragePluginException("本地文件缺少父目录：" + path);
      }
      Files.createDirectories(parent);
      ensureNoSymbolicLink(parent);

      if (Files.exists(target, LinkOption.NOFOLLOW_LINKS)) {
        ensureNoSymbolicLink(target);
        if (Files.isDirectory(target, LinkOption.NOFOLLOW_LINKS)) {
          throw new StoragePluginException("本地目标路径是目录：" + path);
        }
        if (!overwrite) {
          throw new StoragePluginException("本地文件已存在：" + path);
        }
      }

      temporary = Files.createTempFile(stagingDirectory, "upload-", ".tmp");
      long copied = Files.copy(inputStream, temporary, StandardCopyOption.REPLACE_EXISTING);
      if (copied != size) {
        throw new StoragePluginException(
            "上传文件大小不一致，声明 " + size + " 字节，实际 " + copied + " 字节");
      }
      moveTemporaryFile(temporary, target, overwrite);
      temporary = null;
    } catch (StoragePluginException exception) {
      throw exception;
    } catch (IOException exception) {
      throw pluginException("上传本地文件失败：" + path, exception);
    } finally {
      deleteTemporaryQuietly(temporary);
    }
  }

  @Override
  public InputStream download(String path) {
    Path target = requireExisting(path);
    if (!Files.isRegularFile(target, LinkOption.NOFOLLOW_LINKS)) {
      throw new StoragePluginException("本地路径不是文件：" + path);
    }
    try {
      return Files.newInputStream(target, StandardOpenOption.READ);
    } catch (IOException exception) {
      throw pluginException("下载本地文件失败：" + path, exception);
    }
  }

  @Override
  public void delete(String path, boolean recursive) {
    Path target = resolve(path);
    if (!Files.exists(target, LinkOption.NOFOLLOW_LINKS)) {
      return;
    }
    try {
      if (!recursive) {
        Files.delete(target);
        return;
      }
      deleteRecursively(target);
    } catch (DirectoryNotEmptyException exception) {
      throw pluginException("本地目录非空，请使用递归删除：" + path, exception);
    } catch (IOException exception) {
      throw pluginException("删除本地路径失败：" + path, exception);
    }
  }

  @Override
  public void move(String sourcePath, String targetPath, boolean overwrite) {
    Path source = requireExisting(sourcePath);
    Path target = resolve(targetPath);
    if (source.equals(target)) {
      throw new StoragePluginException("本地源路径和目标路径不能相同：" + sourcePath);
    }
    if (Files.isDirectory(source, LinkOption.NOFOLLOW_LINKS) && target.startsWith(source)) {
      throw new StoragePluginException("本地目录不能移动到自身子目录：" + targetPath);
    }

    try {
      if (Files.exists(target, LinkOption.NOFOLLOW_LINKS)) {
        ensureNoSymbolicLink(target);
        if (!overwrite) {
          throw new StoragePluginException("本地目标路径已存在：" + targetPath);
        }
        deleteRecursively(target);
      }
      Path parent = target.getParent();
      if (parent == null) {
        throw new StoragePluginException("本地目标路径缺少父目录：" + targetPath);
      }
      Files.createDirectories(parent);
      ensureNoSymbolicLink(parent);
      movePath(source, target);
    } catch (StoragePluginException exception) {
      throw exception;
    } catch (IOException exception) {
      throw pluginException(
          "移动本地路径失败：" + sourcePath + " -> " + targetPath, exception);
    }
  }

  @Override
  public StorageObjectMetadata metadata(String path) {
    Path target = requireExisting(path);
    try {
      BasicFileAttributes attributes = Files.readAttributes(
          target,
          BasicFileAttributes.class,
          LinkOption.NOFOLLOW_LINKS);
      boolean directory = attributes.isDirectory();
      return StorageObjectMetadata.builder()
          .path(path)
          .directory(directory)
          .size(directory ? 0L : attributes.size())
          .contentType(directory ? null : Files.probeContentType(target))
          .checksum(directory || !properties.isChecksumEnabled() ? null : checksum(target))
          .lastModified(Instant.ofEpochMilli(attributes.lastModifiedTime().toMillis()))
          .build();
    } catch (IOException exception) {
      throw pluginException("读取本地文件元数据失败：" + path, exception);
    }
  }

  Path baseDirectory() {
    return baseDirectory;
  }

  private Path initializeBaseDirectory(String configuredPath) {
    if (configuredPath == null || configuredPath.trim().isEmpty()) {
      throw new StoragePluginException("本地存储根目录不能为空");
    }
    try {
      Path configured = Paths.get(configuredPath).toAbsolutePath().normalize();
      Files.createDirectories(configured);
      if (!Files.isDirectory(configured, LinkOption.NOFOLLOW_LINKS)) {
        throw new StoragePluginException("本地存储根路径不是目录：" + configured);
      }
      if (Files.isSymbolicLink(configured)) {
        throw new StoragePluginException("本地存储根目录不能是符号链接：" + configured);
      }
      return configured.toRealPath();
    } catch (InvalidPathException | IOException exception) {
      throw pluginException("初始化本地存储根目录失败：" + configuredPath, exception);
    }
  }

  private Path initializeStagingDirectory() {
    Path directory = baseDirectory.resolve(INTERNAL_DIRECTORY).resolve(STAGING_DIRECTORY).normalize();
    try {
      Files.createDirectories(directory);
      ensureNoSymbolicLink(directory);
      return directory;
    } catch (IOException exception) {
      throw pluginException("初始化本地存储临时目录失败：" + directory, exception);
    }
  }

  private Path requireExisting(String path) {
    Path target = resolve(path);
    if (!Files.exists(target, LinkOption.NOFOLLOW_LINKS)) {
      throw new StoragePluginException("本地路径不存在：" + path);
    }
    return target;
  }

  private Path resolve(String logicalPath) {
    String normalized = normalize(logicalPath);
    try {
      Path relative = Paths.get(normalized).normalize();
      if (relative.isAbsolute() || relative.getNameCount() == 0) {
        throw new StoragePluginException("本地存储路径必须是相对路径：" + logicalPath);
      }
      Path target = baseDirectory.resolve(relative).normalize();
      if (!target.startsWith(baseDirectory)) {
        throw new StoragePluginException("本地存储路径越界：" + logicalPath);
      }
      ensureNoSymbolicLink(target);
      return target;
    } catch (InvalidPathException exception) {
      throw pluginException("本地存储路径无效：" + logicalPath, exception);
    }
  }

  private String normalize(String path) {
    if (path == null || path.trim().isEmpty()) {
      throw new StoragePluginException("存储路径不能为空");
    }
    String normalized = path.replace('\\', '/').trim();
    while (normalized.startsWith("/")) {
      normalized = normalized.substring(1);
    }
    while (normalized.contains("//")) {
      normalized = normalized.replace("//", "/");
    }
    if (normalized.isEmpty()) {
      throw new StoragePluginException("存储路径不能为空");
    }
    if (normalized.indexOf('\0') >= 0) {
      throw new StoragePluginException("存储路径不能包含空字符");
    }

    String[] segments = normalized.split("/");
    if (segments.length > 0 && INTERNAL_DIRECTORY.equals(segments[0])) {
      throw new StoragePluginException("存储路径不能使用内部保留目录：" + INTERNAL_DIRECTORY);
    }
    for (String segment : segments) {
      if (segment.isEmpty() || ".".equals(segment) || "..".equals(segment)) {
        throw new StoragePluginException("存储路径不能包含当前或上级目录：" + path);
      }
    }
    return normalized;
  }

  private void ensureNoSymbolicLink(Path path) {
    Path normalized = path.toAbsolutePath().normalize();
    if (!normalized.startsWith(baseDirectory)) {
      throw new StoragePluginException("本地存储路径越界：" + path);
    }
    Path current = baseDirectory;
    Path relative = baseDirectory.relativize(normalized);
    for (Path segment : relative) {
      current = current.resolve(segment);
      if (Files.exists(current, LinkOption.NOFOLLOW_LINKS) && Files.isSymbolicLink(current)) {
        throw new StoragePluginException("本地存储路径不能包含符号链接：" + current);
      }
    }
  }

  private void moveTemporaryFile(Path source, Path target, boolean overwrite) throws IOException {
    try {
      if (overwrite) {
        Files.move(
            source,
            target,
            StandardCopyOption.ATOMIC_MOVE,
            StandardCopyOption.REPLACE_EXISTING);
      } else {
        Files.move(source, target, StandardCopyOption.ATOMIC_MOVE);
      }
    } catch (AtomicMoveNotSupportedException exception) {
      if (overwrite) {
        Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
      } else {
        Files.move(source, target);
      }
    } catch (FileAlreadyExistsException exception) {
      if (overwrite) {
        Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
        return;
      }
      throw new StoragePluginException("本地文件已存在：" + target, exception);
    }
  }

  private void movePath(Path source, Path target) throws IOException {
    try {
      Files.move(source, target, StandardCopyOption.ATOMIC_MOVE);
    } catch (AtomicMoveNotSupportedException exception) {
      Files.move(source, target);
    }
  }

  private void deleteRecursively(Path target) throws IOException {
    Files.walkFileTree(target, new SimpleFileVisitor<>() {
      @Override
      public FileVisitResult visitFile(Path file, BasicFileAttributes attributes) throws IOException {
        Files.deleteIfExists(file);
        return FileVisitResult.CONTINUE;
      }

      @Override
      public FileVisitResult postVisitDirectory(Path directory, IOException exception)
          throws IOException {
        if (exception != null) {
          throw exception;
        }
        Files.deleteIfExists(directory);
        return FileVisitResult.CONTINUE;
      }
    });
  }

  private String checksum(Path path) throws IOException {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      try (InputStream inputStream = Files.newInputStream(path);
          DigestInputStream digestInputStream = new DigestInputStream(inputStream, digest)) {
        byte[] buffer = new byte[BUFFER_SIZE];
        while (digestInputStream.read(buffer) >= 0) {
          // 读取完整文件以更新摘要。
        }
      }
      StringBuilder value = new StringBuilder(64);
      for (byte item : digest.digest()) {
        value.append(String.format("%02x", item & 0xff));
      }
      return value.toString();
    } catch (NoSuchAlgorithmException exception) {
      throw new StoragePluginException("当前运行环境不支持 SHA-256", exception);
    }
  }

  private void deleteTemporaryQuietly(Path temporary) {
    if (temporary == null) {
      return;
    }
    try {
      Files.deleteIfExists(temporary);
    } catch (IOException ignored) {
      // 临时文件由后续清理任务兜底，不能覆盖原始异常。
    }
  }

  private StoragePluginException pluginException(String message, Exception cause) {
    if (cause instanceof NoSuchFileException) {
      return new StoragePluginException(message + "，路径不存在", cause);
    }
    return new StoragePluginException(message, cause);
  }
}
