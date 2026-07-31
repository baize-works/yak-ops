package io.yak.ops.spi.storage;

import java.time.Instant;
import lombok.Builder;
import lombok.Value;

/** 存储对象元数据。 */
@Value
@Builder
public class StorageObjectMetadata {

  String path;
  boolean directory;
  long size;
  String contentType;
  String checksum;
  Instant lastModified;
}
