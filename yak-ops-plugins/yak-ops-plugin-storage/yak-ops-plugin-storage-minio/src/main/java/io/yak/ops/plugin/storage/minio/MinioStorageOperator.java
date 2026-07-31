package io.yak.ops.plugin.storage.minio;

import io.minio.BucketExistsArgs;
import io.minio.CopyObjectArgs;
import io.minio.CopySource;
import io.minio.GetObjectArgs;
import io.minio.ListObjectsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.RemoveObjectsArgs;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import io.minio.errors.ErrorResponseException;
import io.minio.messages.DeleteError;
import io.minio.messages.DeleteObject;
import io.minio.messages.Item;
import io.yak.ops.common.enums.resource.ResourceStorageType;
import io.yak.ops.spi.storage.StorageObjectMetadata;
import io.yak.ops.spi.storage.StorageOperator;
import io.yak.ops.spi.storage.StoragePluginException;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.util.StringUtils;

/** MinIO 资源存储实现。 */
public class MinioStorageOperator implements StorageOperator {

  private static final byte[] EMPTY_CONTENT = new byte[0];

  private final MinioClient client;
  private final MinioStorageProperties properties;
  private volatile boolean bucketReady;

  public MinioStorageOperator(MinioClient client, MinioStorageProperties properties) {
    this.client = client;
    this.properties = properties;
  }

  @Override
  public ResourceStorageType type() {
    return ResourceStorageType.MINIO;
  }

  @Override
  public String name() {
    return "MinIO";
  }

  @Override
  public void createDirectory(String path) {
    String objectName = directoryObjectName(path);
    upload(objectName, new ByteArrayInputStream(EMPTY_CONTENT), 0L,
        "application/x-directory", false);
  }

  @Override
  public boolean exists(String path) {
    ensureBucket();
    String objectName = objectName(path);
    try {
      client.statObject(
          StatObjectArgs.builder().bucket(properties.getBucket()).object(objectName).build());
      return true;
    } catch (ErrorResponseException exception) {
      if (!isNotFound(exception)) {
        throw pluginException("检查 MinIO 对象失败", exception);
      }
    } catch (Exception exception) {
      throw pluginException("检查 MinIO 对象失败", exception);
    }

    String prefix = directoryObjectName(path);
    try {
      for (io.minio.Result<Item> result : client.listObjects(
          ListObjectsArgs.builder()
              .bucket(properties.getBucket())
              .prefix(prefix)
              .recursive(true)
              .build())) {
        result.get();
        return true;
      }
      return false;
    } catch (Exception exception) {
      throw pluginException("检查 MinIO 目录失败", exception);
    }
  }

  @Override
  public void upload(
      String path,
      InputStream inputStream,
      long size,
      String contentType,
      boolean overwrite) {
    ensureBucket();
    String objectName = objectName(path);
    if (!overwrite && exists(objectName)) {
      throw new StoragePluginException("MinIO 对象已存在：" + objectName);
    }
    try {
      client.putObject(
          PutObjectArgs.builder()
              .bucket(properties.getBucket())
              .object(objectName)
              .stream(inputStream, size, -1)
              .contentType(StringUtils.hasText(contentType)
                  ? contentType
                  : "application/octet-stream")
              .build());
    } catch (Exception exception) {
      throw pluginException("上传 MinIO 对象失败：" + objectName, exception);
    }
  }

  @Override
  public InputStream download(String path) {
    ensureBucket();
    String objectName = objectName(path);
    try {
      return client.getObject(
          GetObjectArgs.builder().bucket(properties.getBucket()).object(objectName).build());
    } catch (Exception exception) {
      throw pluginException("下载 MinIO 对象失败：" + objectName, exception);
    }
  }

  @Override
  public void delete(String path, boolean recursive) {
    ensureBucket();
    String objectName = objectName(path);
    if (!recursive) {
      try {
        client.removeObject(
            RemoveObjectArgs.builder().bucket(properties.getBucket()).object(objectName).build());
        return;
      } catch (Exception exception) {
        throw pluginException("删除 MinIO 对象失败：" + objectName, exception);
      }
    }

    String prefix = directoryObjectName(path);
    List<DeleteObject> objects = new ArrayList<>();
    try {
      for (io.minio.Result<Item> result : client.listObjects(
          ListObjectsArgs.builder()
              .bucket(properties.getBucket())
              .prefix(prefix)
              .recursive(true)
              .build())) {
        objects.add(new DeleteObject(result.get().objectName()));
      }
      if (objects.isEmpty()) {
        objects.add(new DeleteObject(objectName));
      }
      Iterable<io.minio.Result<DeleteError>> errors = client.removeObjects(
          RemoveObjectsArgs.builder().bucket(properties.getBucket()).objects(objects).build());
      for (io.minio.Result<DeleteError> error : errors) {
        DeleteError deleteError = error.get();
        throw new StoragePluginException(
            "删除 MinIO 对象失败：" + deleteError.objectName() + "，" + deleteError.message());
      }
    } catch (StoragePluginException exception) {
      throw exception;
    } catch (Exception exception) {
      throw pluginException("递归删除 MinIO 目录失败：" + prefix, exception);
    }
  }

  @Override
  public void move(String sourcePath, String targetPath, boolean overwrite) {
    ensureBucket();
    String source = objectName(sourcePath);
    String target = objectName(targetPath);
    if (!overwrite && exists(target)) {
      throw new StoragePluginException("目标 MinIO 对象已存在：" + target);
    }

    String sourceDirectory = directoryObjectName(sourcePath);
    List<String> sourceObjects = listObjectNames(sourceDirectory);
    if (sourceObjects.isEmpty()) {
      copyObject(source, target);
      removeObject(source);
      return;
    }

    String targetDirectory = directoryObjectName(targetPath);
    List<String> copiedTargets = new ArrayList<>();
    try {
      for (String sourceObject : sourceObjects) {
        String relative = sourceObject.substring(sourceDirectory.length());
        String targetObject = targetDirectory + relative;
        if (!overwrite && exists(targetObject)) {
          throw new StoragePluginException("目标 MinIO 对象已存在：" + targetObject);
        }
        copyObject(sourceObject, targetObject);
        copiedTargets.add(targetObject);
      }
      delete(sourceDirectory, true);
    } catch (RuntimeException exception) {
      for (String copiedTarget : copiedTargets) {
        try {
          removeObject(copiedTarget);
        } catch (RuntimeException ignored) {
          // 回滚清理失败不覆盖原始异常。
        }
      }
      throw exception;
    }
  }

  @Override
  public StorageObjectMetadata metadata(String path) {
    ensureBucket();
    String objectName = objectName(path);
    try {
      StatObjectResponse response = client.statObject(
          StatObjectArgs.builder().bucket(properties.getBucket()).object(objectName).build());
      Instant modified = response.lastModified() == null
          ? null
          : response.lastModified().toInstant();
      return StorageObjectMetadata.builder()
          .path(path)
          .directory(objectName.endsWith("/"))
          .size(response.size())
          .contentType(response.contentType())
          .checksum(response.etag())
          .lastModified(modified)
          .build();
    } catch (Exception exception) {
      throw pluginException("读取 MinIO 对象元数据失败：" + objectName, exception);
    }
  }

  private List<String> listObjectNames(String prefix) {
    List<String> names = new ArrayList<>();
    try {
      for (io.minio.Result<Item> result : client.listObjects(
          ListObjectsArgs.builder()
              .bucket(properties.getBucket())
              .prefix(prefix)
              .recursive(true)
              .build())) {
        names.add(result.get().objectName());
      }
      return names;
    } catch (Exception exception) {
      throw pluginException("列举 MinIO 对象失败：" + prefix, exception);
    }
  }

  private void copyObject(String source, String target) {
    try {
      client.copyObject(
          CopyObjectArgs.builder()
              .bucket(properties.getBucket())
              .object(target)
              .source(CopySource.builder()
                  .bucket(properties.getBucket())
                  .object(source)
                  .build())
              .build());
    } catch (Exception exception) {
      throw pluginException("复制 MinIO 对象失败：" + source + " -> " + target, exception);
    }
  }

  private void removeObject(String objectName) {
    try {
      client.removeObject(
          RemoveObjectArgs.builder().bucket(properties.getBucket()).object(objectName).build());
    } catch (Exception exception) {
      throw pluginException("删除 MinIO 对象失败：" + objectName, exception);
    }
  }

  private void ensureBucket() {
    if (bucketReady) {
      return;
    }
    synchronized (this) {
      if (bucketReady) {
        return;
      }
      try {
        boolean exists = client.bucketExists(
            BucketExistsArgs.builder().bucket(properties.getBucket()).build());
        if (!exists) {
          if (!properties.isAutoCreateBucket()) {
            throw new StoragePluginException("MinIO bucket 不存在：" + properties.getBucket());
          }
          client.makeBucket(MakeBucketArgs.builder().bucket(properties.getBucket()).build());
        }
        bucketReady = true;
      } catch (StoragePluginException exception) {
        throw exception;
      } catch (Exception exception) {
        throw pluginException("初始化 MinIO bucket 失败：" + properties.getBucket(), exception);
      }
    }
  }

  private String objectName(String path) {
    String normalized = normalize(path);
    if (!StringUtils.hasText(properties.getBasePrefix())) {
      return normalized;
    }
    String basePrefix = normalize(properties.getBasePrefix());
    return normalized.startsWith(basePrefix + "/") || normalized.equals(basePrefix)
        ? normalized
        : basePrefix + "/" + normalized;
  }

  private String directoryObjectName(String path) {
    String objectName = objectName(path);
    return objectName.endsWith("/") ? objectName : objectName + "/";
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
    if (!StringUtils.hasText(normalized)) {
      throw new StoragePluginException("存储路径不能为空");
    }
    if (normalized.equals("..") || normalized.startsWith("../") || normalized.contains("/../")) {
      throw new StoragePluginException("存储路径不能包含上级目录：" + path);
    }
    return normalized;
  }

  private boolean isNotFound(ErrorResponseException exception) {
    if (exception.errorResponse() == null) {
      return false;
    }
    String code = exception.errorResponse().code();
    return "NoSuchKey".equals(code)
        || "NoSuchObject".equals(code)
        || "NoSuchBucket".equals(code);
  }

  private StoragePluginException pluginException(String message, Exception cause) {
    return new StoragePluginException(message, cause);
  }
}
