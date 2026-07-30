package io.yak.ops.business.sync.realtime.deployment;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Set;

/** 限制包含连接凭据的 Pipeline 和清单文件访问权限。 */
public final class DeploymentFileSecurity {

  private DeploymentFileSecurity() {
  }

  public static void ownerReadWrite(Path path) {
    try {
      Files.setPosixFilePermissions(path, Set.of(
          PosixFilePermission.OWNER_READ,
          PosixFilePermission.OWNER_WRITE));
    } catch (UnsupportedOperationException ignored) {
      // 非 POSIX 文件系统保留平台默认权限。
    } catch (Exception exception) {
      throw new IllegalStateException("设置部署文件权限失败：" + path, exception);
    }
  }
}
