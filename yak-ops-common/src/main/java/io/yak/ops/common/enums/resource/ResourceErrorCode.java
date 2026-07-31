package io.yak.ops.common.enums.resource;

import io.yak.framework.common.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** 资源管理业务错误码。 */
@Getter
@RequiredArgsConstructor
public enum ResourceErrorCode implements ErrorCode {

  NOT_FOUND(43001, "资源不存在"),
  PARENT_NOT_FOUND(43002, "父目录不存在"),
  PARENT_NOT_DIRECTORY(43003, "父资源不是目录"),
  DUPLICATE_NAME(43004, "同级资源名称已存在"),
  INVALID_NAME(43005, "资源名称不合法"),
  INVALID_NODE_TYPE(43006, "资源类型不合法"),
  STORAGE_PLUGIN_NOT_FOUND(43007, "资源存储插件未安装"),
  STORAGE_OPERATION_FAILED(43008, "资源存储操作失败"),
  CREATE_FAILED(43009, "创建资源失败"),
  UPDATE_FAILED(43010, "更新资源失败"),
  DELETE_FAILED(43011, "删除资源失败"),
  QUERY_FAILED(43012, "查询资源失败"),
  FILE_TOO_LARGE(43013, "上传文件超过大小限制"),
  DIRECTORY_CONTENT_UNSUPPORTED(43014, "目录不支持读取或更新内容"),
  CROSS_STORAGE_MOVE_UNSUPPORTED(43015, "不支持跨存储类型移动资源"),
  INVALID_MOVE_TARGET(43016, "资源不能移动到自身或其子目录"),
  CONTENT_NOT_EDITABLE(43017, "该资源不支持在线编辑"),
  DOWNLOAD_FAILED(43018, "下载资源失败");

  private final Integer code;
  private final String message;
}
