package io.yak.ops.boot.config;

import io.yak.framework.security.dao.PermissionDao;
import io.yak.framework.security.permission.PermissionDefinition;
import io.yak.framework.security.permission.PermissionDefinitionProvider;
import io.yak.framework.security.service.RolePermissionService;
import io.yak.framework.security.service.RoleService;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Declares the built-in Yak Ops permission tree consumed by Yak Security.
 *
 * <p>The permission codes are shared with the frontend navigation contract. Legacy permission codes
 * remain declared during the migration period so existing roles are not invalidated abruptly.</p>
 */
@Configuration(proxyBeanMethods = false)
public class YakOpsPermissionConfiguration {

  @Bean
  public PermissionDefinitionProvider yakOpsPermissionDefinitionProvider() {
    return () -> List.of(
        securityPermissions(),
        taskPermissions(),
        datasourcePermissions(),
        jobPermissions(),
        workflowPermissions(),
        resourcePermissions(),
        qualityPermissions(),
        operationsPermissions(),
        knowledgePermissions());
  }

  /**
   * Backfills the root permission for an administrator role created before the permission contract
   * was aligned with the frontend.
   */
  @Bean
  @ConditionalOnProperty(
      prefix = "yak.security",
      name = "database-enabled",
      havingValue = "true",
      matchIfMissing = true)
  public YakOpsAdministratorPermissionInitializer yakOpsAdministratorPermissionInitializer(
      RoleService roleService,
      RolePermissionService rolePermissionService,
      PermissionDao permissionDao) {
    return new YakOpsAdministratorPermissionInitializer(
        roleService, rolePermissionService, permissionDao);
  }

  private static PermissionDefinition securityPermissions() {
    return PermissionDefinition.of(
        "security",
        "系统管理",
        item("security:root", "超级管理员"),
        item("security:user:read", "查看用户管理"),
        item("security:role:read", "查看角色管理"),
        item("security:permission:read", "查看权限管理"),
        item("security:department:read", "查看部门管理"),
        item("security:project:read", "查看授权项目"),
        item("security:resource-permission:read", "查看资源授权"),
        item("security:config:read", "查看系统配置"),
        item("security:operation-log:read", "查看操作日志"));
  }

  private static PermissionDefinition taskPermissions() {
    return PermissionDefinition.of(
        "task",
        "数据集成",
        item("task:batch:read", "查看离线同步"),
        item("task:batch:create", "新建离线同步"),
        item("task:realtime:read", "查看实时同步"),
        item("task:realtime:create", "新建实时同步"));
  }

  /** Legacy datasource permissions retained for existing roles and API checks. */
  private static PermissionDefinition datasourcePermissions() {
    return PermissionDefinition.of(
        "datasource",
        "数据源管理兼容权限",
        item("datasource:view", "查看数据源"),
        item("datasource:create", "新增数据源"),
        item("datasource:update", "编辑数据源"),
        item("datasource:delete", "删除数据源"),
        item("datasource:test", "测试数据源连接"));
  }

  /** Legacy job permissions retained for existing roles and API checks. */
  private static PermissionDefinition jobPermissions() {
    return PermissionDefinition.of(
        "job",
        "任务管理兼容权限",
        item("job:view", "查看任务"),
        item("job:create", "新增任务"),
        item("job:update", "编辑任务"),
        item("job:delete", "删除任务"),
        item("job:execute", "执行任务"),
        item("job:stop", "停止任务"));
  }

  private static PermissionDefinition workflowPermissions() {
    return PermissionDefinition.of(
        "workflow",
        "流程编排",
        item("workflow:project:read", "查看工作流项目"),
        item("workflow:definition:read", "查看工作流定义"),
        item("workflow:definition:create", "新建工作流定义"),
        item("workflow:definition:update", "编辑工作流定义"),
        item("workflow:definition:publish", "发布工作流定义"),
        item("workflow:instance:read", "查看工作流实例"),
        item("workflow:instance:execute", "执行工作流实例"),
        item("workflow:instance:stop", "停止工作流实例"),
        item("workflow:schedule:manage", "管理工作流调度"),
        item("workflow:view", "查看工作流（兼容）"),
        item("workflow:create", "新增工作流（兼容）"),
        item("workflow:update", "编辑工作流（兼容）"),
        item("workflow:delete", "删除工作流（兼容）"),
        item("workflow:execute", "执行工作流（兼容）"));
  }

  private static PermissionDefinition resourcePermissions() {
    return PermissionDefinition.of(
        "resource",
        "资源管理",
        item("resource:data-source:read", "查看数据源管理"),
        item("resource:client:read", "查看客户端管理"),
        item("resource:connector:read", "查看连接器管理"),
        item("resource:view", "查看资源（兼容）"),
        item("resource:upload", "上传资源（兼容）"),
        item("resource:download", "下载资源（兼容）"),
        item("resource:update", "编辑资源（兼容）"),
        item("resource:delete", "删除资源（兼容）"));
  }

  private static PermissionDefinition qualityPermissions() {
    return PermissionDefinition.of(
        "quality",
        "数据质量",
        item("quality:rule:read", "查看质量规则"),
        item("quality:report:read", "查看质量报告"),
        item("quality:view", "查看质量规则（兼容）"),
        item("quality:create", "新增质量规则（兼容）"),
        item("quality:update", "编辑质量规则（兼容）"),
        item("quality:delete", "删除质量规则（兼容）"),
        item("quality:execute", "执行质量检查（兼容）"));
  }

  private static PermissionDefinition operationsPermissions() {
    return PermissionDefinition.of(
        "operations",
        "运维中心",
        item("operations:metrics:read", "查看运行监控"),
        item("operations:alarm:read", "查看告警管理"));
  }

  private static PermissionDefinition knowledgePermissions() {
    return PermissionDefinition.of(
        "knowledge",
        "知识管理",
        item("knowledge:read", "查看知识管理"));
  }

  private static PermissionDefinition.Item item(String code, String name) {
    return PermissionDefinition.Item.of(code, name);
  }
}
