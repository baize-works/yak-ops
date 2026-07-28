package io.yak.ops.boot.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class YakOpsSecurityCatalogMigrationTest {

  @Test
  void migrationOwnsPermissionsMenusAndCompatibilityBackfills()
      throws Exception {

    ClassPathResource resource = new ClassPathResource(
        "yak-security/db/migration/V1000__init_yak_ops_security_catalog.sql");
    String sql = resource.getContentAsString(StandardCharsets.UTF_8);

    assertThat(sql)
        .contains("INSERT INTO yak_security_permission")
        .contains("INSERT INTO yak_security_menu")
        .contains("'security:root'")
        .contains("'task:batch:read'")
        .contains("'workflow:definition:update'")
        .contains("'workflow:definition:publish'")
        .contains("'workflow:instance:execute'")
        .contains("'workflow:instance:stop'")
        .contains("'workflow:schedule:manage'")
        .contains("'resource:data-source:read'")
        .contains("'quality:report:read'")
        .contains("'knowledge-management'")
        .contains("INSERT IGNORE INTO yak_security_role_permission")
        .contains("INSERT IGNORE INTO yak_security_role_menu")
        .contains("declared=VALUES(declared)");
  }
}
