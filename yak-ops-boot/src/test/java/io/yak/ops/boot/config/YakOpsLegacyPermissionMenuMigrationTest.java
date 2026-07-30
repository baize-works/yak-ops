package io.yak.ops.boot.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class YakOpsLegacyPermissionMenuMigrationTest {

  @Test
  void migrationCompletesMenuCodesForLegacyLeafPermissions() throws Exception {
    ClassPathResource resource = new ClassPathResource(
        "yak-security/db/migration/V1310__link_legacy_permissions_to_menus.sql");
    String sql = resource.getContentAsString(StandardCharsets.UTF_8);

    assertThat(sql)
        .contains("permission_code LIKE 'job:%'")
        .contains("SET menu_code='batch-link-up'")
        .contains("'resource:view'")
        .contains("'resource:upload'")
        .contains("'resource:download'")
        .contains("'resource:update'")
        .contains("'resource:delete'")
        .contains("SET menu_code='data-source'")
        .contains("INSERT IGNORE INTO yak_security_role_menu");
  }
}
