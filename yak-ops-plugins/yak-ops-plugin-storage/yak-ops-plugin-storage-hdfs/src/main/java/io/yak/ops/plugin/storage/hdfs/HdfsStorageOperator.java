package io.yak.ops.plugin.storage.hdfs;

import io.yak.ops.common.enums.resource.ResourceStorageType;
import io.yak.ops.spi.storage.StorageObjectMetadata;
import io.yak.ops.spi.storage.StorageOperator;
import io.yak.ops.spi.storage.StoragePluginException;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import org.apache.hadoop.fs.FSDataOutputStream;
import org.apache.hadoop.fs.FileChecksum;
import org.apache.hadoop.fs.FileStatus;
import org.apache.hadoop.fs.FileSystem;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.IOUtils;
import org.springframework.util.StringUtils;

/** HDFS 资源存储实现。 */
public class HdfsStorageOperator implements StorageOperator {

  private final FileSystem fileSystem;
  private final HdfsStorageProperties properties;
  private final Path baseDirectory;

  public HdfsStorageOperator(FileSystem fileSystem, HdfsStorageProperties properties) {
    this.fileSystem = fileSystem;
    this.properties = properties;
    this.baseDirectory = new Path(properties.getBaseDirectory());
  }

  @Override
  public ResourceStorageType type() {
    return ResourceStorageType.HDFS;
  }

  @Override
  public String name() {
    return "HDFS";
  }

  @Override
  public void createDirectory(String path) {
    Path target = resolve(path);
    try {
      if (fileSystem.exists(target)) {
        throw new StoragePluginException("HDFS 目录已存在：" + target);
      }
      if (!fileSystem.mkdirs(target)) {
        throw new StoragePluginException("创建 HDFS 目录失败：" + target);
      }
    } catch (IOException exception) {
      throw pluginException("创建 HDFS 目录失败：" + target, exception);
    }
  }

  @Override
  public boolean exists(String path) {
    Path target = resolve(path);
    try {
      return fileSystem.exists(target);
    } catch (IOException exception) {
      throw pluginException("检查 HDFS 路径失败：" + target, exception);
    }
  }

  @Override
  public void upload(
      String path,
      InputStream inputStream,
      long size,
      String contentType,
      boolean overwrite) {
    Path target = resolve(path);
    try {
      Path parent = target.getParent();
      if (parent != null && !fileSystem.exists(parent) && !fileSystem.mkdirs(parent)) {
        throw new StoragePluginException("创建 HDFS 父目录失败：" + parent);
      }
      if (!overwrite && fileSystem.exists(target)) {
        throw new StoragePluginException("HDFS 文件已存在：" + target);
      }
      long blockSize = fileSystem.getDefaultBlockSize(target);
      try (FSDataOutputStream outputStream = fileSystem.create(
          target,
          overwrite,
          fileSystem.getConf().getInt("io.file.buffer.size", 4096),
          properties.getReplication(),
          blockSize)) {
        IOUtils.copyBytes(inputStream, outputStream, 8192, false);
        outputStream.hflush();
      }
    } catch (StoragePluginException exception) {
      throw exception;
    } catch (IOException exception) {
      throw pluginException("上传 HDFS 文件失败：" + target, exception);
    }
  }

  @Override
  public InputStream download(String path) {
    Path target = resolve(path);
    try {
      return fileSystem.open(target);
    } catch (IOException exception) {
      throw pluginException("下载 HDFS 文件失败：" + target, exception);
    }
  }

  @Override
  public void delete(String path, boolean recursive) {
    Path target = resolve(path);
    try {
      if (!fileSystem.exists(target)) {
        return;
      }
      if (!fileSystem.delete(target, recursive)) {
        throw new StoragePluginException("删除 HDFS 路径失败：" + target);
      }
    } catch (StoragePluginException exception) {
      throw exception;
    } catch (IOException exception) {
      throw pluginException("删除 HDFS 路径失败：" + target, exception);
    }
  }

  @Override
  public void move(String sourcePath, String targetPath, boolean overwrite) {
    Path source = resolve(sourcePath);
    Path target = resolve(targetPath);
    try {
      if (!fileSystem.exists(source)) {
        throw new StoragePluginException("HDFS 源路径不存在：" + source);
      }
      if (fileSystem.exists(target)) {
        if (!overwrite) {
          throw new StoragePluginException("HDFS 目标路径已存在：" + target);
        }
        if (!fileSystem.delete(target, true)) {
          throw new StoragePluginException("清理 HDFS 目标路径失败：" + target);
        }
      }
      Path parent = target.getParent();
      if (parent != null && !fileSystem.exists(parent) && !fileSystem.mkdirs(parent)) {
        throw new StoragePluginException("创建 HDFS 目标父目录失败：" + parent);
      }
      if (!fileSystem.rename(source, target)) {
        throw new StoragePluginException("移动 HDFS 路径失败：" + source + " -> " + target);
      }
    } catch (StoragePluginException exception) {
      throw exception;
    } catch (IOException exception) {
      throw pluginException("移动 HDFS 路径失败：" + source + " -> " + target, exception);
    }
  }

  @Override
  public StorageObjectMetadata metadata(String path) {
    Path target = resolve(path);
    try {
      FileStatus status = fileSystem.getFileStatus(target);
      FileChecksum checksum = status.isFile() ? fileSystem.getFileChecksum(target) : null;
      return StorageObjectMetadata.builder()
          .path(path)
          .directory(status.isDirectory())
          .size(status.getLen())
          .contentType(null)
          .checksum(checksum == null ? null : checksum.toString())
          .lastModified(Instant.ofEpochMilli(status.getModificationTime()))
          .build();
    } catch (IOException exception) {
      throw pluginException("读取 HDFS 元数据失败：" + target, exception);
    }
  }

  private Path resolve(String logicalPath) {
    String normalized = normalize(logicalPath);
    Path target = new Path(baseDirectory, normalized);
    String base = baseDirectory.toUri().normalize().getPath();
    String resolved = target.toUri().normalize().getPath();
    String basePrefix = base.endsWith("/") ? base : base + "/";
    if (!resolved.equals(base) && !resolved.startsWith(basePrefix)) {
      throw new StoragePluginException("HDFS 路径越界：" + logicalPath);
    }
    return target;
  }

  private String normalize(String path) {
    if (!StringUtils.hasText(path)) {
      throw new StoragePluginException("存储路径不能为空");
    }
    String normalized = path.replace('\\', '/').trim();
    while (normalized.startsWith("/")) {
      normalized = normalized.substring(1);
    }
    while (normalized.contains("//")) {
      normalized = normalized.replace("//", "/");
    }
    if (normalized.equals("..") || normalized.startsWith("../") || normalized.contains("/../")) {
      throw new StoragePluginException("存储路径不能包含上级目录：" + path);
    }
    return normalized;
  }

  private StoragePluginException pluginException(String message, IOException cause) {
    return new StoragePluginException(message, cause);
  }
}
