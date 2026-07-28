package io.yak.ops.boot.config;

import io.yak.framework.security.common.entity.Permission;
import io.yak.framework.security.common.vo.role.RoleBriefVO;
import io.yak.framework.security.dao.PermissionDao;
import io.yak.framework.security.service.RolePermissionService;
import io.yak.framework.security.service.RoleService;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;

/**
 * Ensures the built-in administrator role owns the root permission.
 *
 * <p>This initializer is intentionally idempotent. It covers existing databases where the
 * administrator was created before {@code security:root} became part of the Yak Ops permission
 * contract. New installations already receive the permission through Yak Security bootstrap.</p>
 */
public final class YakOpsAdministratorPermissionInitializer
    implements ApplicationRunner, Ordered {

  private static final Logger LOGGER =
      LoggerFactory.getLogger(YakOpsAdministratorPermissionInitializer.class);
  private static final String ADMINISTRATOR_ROLE = "系统管理员";
  private static final String ROOT_PERMISSION = "security:root";

  private final RoleService roleService;
  private final RolePermissionService rolePermissionService;
  private final PermissionDao permissionDao;

  public YakOpsAdministratorPermissionInitializer(
      RoleService roleService,
      RolePermissionService rolePermissionService,
      PermissionDao permissionDao) {
    this.roleService = roleService;
    this.rolePermissionService = rolePermissionService;
    this.permissionDao = permissionDao;
  }

  @Override
  public int getOrder() {
    return Ordered.LOWEST_PRECEDENCE;
  }

  @Override
  public void run(ApplicationArguments args) {
    RoleBriefVO administratorRole = roleService
        .getRoleBriefListByRoleName(ADMINISTRATOR_ROLE)
        .stream()
        .findFirst()
        .orElse(null);
    if (administratorRole == null || administratorRole.getId() == null) {
      return;
    }

    Permission rootPermission = permissionDao.selectAllAndAscOrderByLevel()
        .stream()
        .filter(permission -> ROOT_PERMISSION.equals(permission.getPermissionCode()))
        .findFirst()
        .orElseThrow(() -> new IllegalStateException(
            "Cannot grant Yak Ops administrator permission: security:root is not declared"));

    List<Long> permissionIds = new ArrayList<>(
        rolePermissionService.getPermissionIdListByRoleId(administratorRole.getId()));
    if (permissionIds.contains(rootPermission.getId())) {
      return;
    }

    permissionIds.add(rootPermission.getId());
    rolePermissionService.updateRolePermission(administratorRole.getId(), permissionIds);
    LOGGER.info("Granted '{}' to Yak Security role '{}'", ROOT_PERMISSION, ADMINISTRATOR_ROLE);
  }
}
