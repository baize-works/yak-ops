package io.yak.ops.business.resource.util;

import io.yak.ops.business.resource.exception.ResourceException;
import io.yak.ops.common.enums.resource.ResourceErrorCode;
import org.springframework.util.StringUtils;

/** 资源名称与路径安全处理。 */
public final class ResourcePathUtils {

  private ResourcePathUtils() {
  }

  public static String normalizeName(String value) {
    if (!StringUtils.hasText(value)) {
      throw new ResourceException(ResourceErrorCode.INVALID_NAME, "名称不能为空");
    }
    String name = value.trim();
    if (name.length() > 255) {
      throw new ResourceException(ResourceErrorCode.INVALID_NAME, "名称不能超过 255 个字符");
    }
    if (".".equals(name)
        || "..".equals(name)
        || name.indexOf('/') >= 0
        || name.indexOf('\\') >= 0
        || name.indexOf('\0') >= 0) {
      throw new ResourceException(ResourceErrorCode.INVALID_NAME, name);
    }
    return name;
  }

  public static String childPath(String parentPath, String name) {
    String normalizedName = normalizeName(name);
    if (!StringUtils.hasText(parentPath) || "/".equals(parentPath)) {
      return "/" + normalizedName;
    }
    return parentPath + "/" + normalizedName;
  }

  public static String storagePath(String fullPath) {
    if (!StringUtils.hasText(fullPath) || "/".equals(fullPath)) {
      throw new ResourceException(ResourceErrorCode.INVALID_NAME, "资源路径不能为空");
    }
    return fullPath.startsWith("/") ? fullPath.substring(1) : fullPath;
  }

  public static String suffix(String name) {
    int index = name == null ? -1 : name.lastIndexOf('.');
    return index <= 0 || index == name.length() - 1
        ? null
        : name.substring(index + 1).toLowerCase();
  }
}
