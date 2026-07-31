package io.yak.ops.business.resource.model;

import java.io.InputStream;
import lombok.Value;

/** 资源下载流及响应元数据。 */
@Value
public class ResourceDownload {

  String fileName;
  String contentType;
  long fileSize;
  InputStream inputStream;
}
