package io.yak.ops.boot.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class YakOpsPermissionMenuMigrationTest {

  @Test
  void migrationLinksBusinessActionsToBusinessMenus() throws Exception {
    ClassPathResource resource = new ClassPathResource(
        "yak-security/db/migration/V1300__link_yak_ops_permissions_to_menus.sql");
    String sql = resource.getContentAsString(StandardCharsets.UTF_8);

    assertThat(sql)
        .contains("SET menu_code='batch-link-up'")
        .contains("SET menu_code='workflow-management'")
        .contains("'workflow:create'")
        .contains("SET menu_code='data-source'")
        .contains("SET menu_code='data-quality'")
        .contains("SET menu_code='metrics'")
        .contains("INSERT IGNORE INTO yak_security_role_menu")
        .contains("permission_row.menu_code")
        .doesNotContain("SET menu_code='system-users'")
        .doesNotContain("security:user:create");
  }
}
