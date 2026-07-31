package io.yak.ops.common.constant.resource;

/** 资源管理权限编码，复用 Yak Ops 已有资源兼容权限。 */
public final class ResourcePermissionCode {

  public static final String READ = "resource:view";
  public static final String CREATE = "resource:upload";
  public static final String UPDATE = "resource:update";
  public static final String DELETE = "resource:delete";
  public static final String DOWNLOAD = "resource:download";

  private ResourcePermissionCode() {
  }
}
