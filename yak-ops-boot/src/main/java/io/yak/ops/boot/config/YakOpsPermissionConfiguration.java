package io.yak.ops.boot.config;

import io.yak.framework.security.permission.PermissionDefinition;
import io.yak.framework.security.permission.PermissionDefinitionProvider;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Declares the built-in Yak Ops permission tree consumed by Yak Security.
 *
 * <p>The declarations are synchronized before the bootstrap administrator is created. This gives
 * the initial administrator role a complete, deterministic permission set without coupling every
 * business module directly to the security starter.</p>
 */
@Configuration(proxyBeanMethods = false)
public class YakOpsPermissionConfiguration {

  @Bean
  public PermissionDefinitionProvider yakOpsPermissionDefinitionProvider() {
    return () -> List.of(
        datasourcePermissions(),
        jobPermissions(),
        workflowPermissions(),
        qualityPermissions(),
        resourcePermissions());
  }

  private static PermissionDefinition datasourcePermissions() {
    return PermissionDefinition.of(
        "datasource",
        "数据源管理",
        item("datasource:view", "查看数据源"),
        item("datasource:create", "新增数据源"),
        item("datasource:update", "编辑数据源"),
        item("datasource:delete", "删除数据源"),
        item("datasource:test", "测试数据源连接"));
  }

  private static PermissionDefinition jobPermissions() {
    return PermissionDefinition.of(
        "job",
        "任务管理",
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
        "工作流管理",
        item("workflow:view", "查看工作流"),
        item("workflow:create", "新增工作流"),
        item("workflow:update", "编辑工作流"),
        item("workflow:delete", "删除工作流"),
        item("workflow:execute", "执行工作流"));
  }

  private static PermissionDefinition qualityPermissions() {
    return PermissionDefinition.of(
        "quality",
        "数据质量管理",
        item("quality:view", "查看质量规则"),
        item("quality:create", "新增质量规则"),
        item("quality:update", "编辑质量规则"),
        item("quality:delete", "删除质量规则"),
        item("quality:execute", "执行质量检查"));
  }

  private static PermissionDefinition resourcePermissions() {
    return PermissionDefinition.of(
        "resource",
        "资源管理",
        item("resource:view", "查看资源"),
        item("resource:upload", "上传资源"),
        item("resource:download", "下载资源"),
        item("resource:update", "编辑资源"),
        item("resource:delete", "删除资源"));
  }

  private static PermissionDefinition.Item item(String code, String name) {
    return PermissionDefinition.Item.of(code, name);
  }
}
