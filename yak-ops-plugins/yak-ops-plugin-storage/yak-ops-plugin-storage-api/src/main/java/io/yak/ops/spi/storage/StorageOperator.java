package io.yak.ops.spi.storage;

import io.yak.ops.common.enums.resource.ResourceStorageType;
import java.io.InputStream;

/**
 * 资源存储插件稳定接口。
 *
 * <p>接口只接受相对逻辑路径，具体 bucket、HDFS 根目录和连接参数由实现插件负责。
 */
public interface StorageOperator {

  /** 插件唯一存储类型。 */
  ResourceStorageType type();

  /** 插件展示名称。 */
  String name();

  /** 创建目录；对象存储实现可创建目录标记对象。 */
  void createDirectory(String path);

  /** 判断文件或目录是否存在。 */
  boolean exists(String path);

  /** 上传文件内容。 */
  void upload(String path, InputStream inputStream, long size, String contentType, boolean overwrite);

  /** 下载文件内容，调用方负责关闭返回流。 */
  InputStream download(String path);

  /** 删除文件或目录。 */
  void delete(String path, boolean recursive);

  /** 移动文件或目录。 */
  void move(String sourcePath, String targetPath, boolean overwrite);

  /** 获取文件或目录元数据。 */
  StorageObjectMetadata metadata(String path);
}
