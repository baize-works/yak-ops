package io.yak.ops.business.workflow;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class WorkflowSchemaVersionMigrationTest {

  @Test
  void migrationAddsSchemaVersionColumnsWithV1Defaults() throws Exception {
    String resource = "db/migration/yak-workflow/V3__add_workflow_schema_version.sql";
    try (InputStream input = getClass().getClassLoader().getResourceAsStream(resource)) {
      if (input == null) throw new AssertionError("Migration not found: " + resource);
      String sql = new String(input.readAllBytes(), StandardCharsets.UTF_8).toLowerCase();
      assertTrue(sql.contains("draft_schema_version"));
      assertTrue(sql.contains("schema_version"));
      assertTrue(sql.contains("default 1"));
    }
  }
}
