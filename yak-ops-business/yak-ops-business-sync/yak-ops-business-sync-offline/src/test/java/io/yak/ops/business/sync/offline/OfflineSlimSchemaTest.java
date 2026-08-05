package io.yak.ops.business.sync.offline;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class OfflineSlimSchemaTest {
  @Test
  void rebuildsOnlyPhaseOneTables() throws Exception {
    try (InputStream input = getClass().getResourceAsStream(
        "/db/migration/yak-offline-sync/V1__create_offline_sync_core.sql")) {
      assertTrue(input != null);
      String sql = new String(input.readAllBytes(), StandardCharsets.UTF_8);
      assertTrue(sql.contains("CREATE TABLE yak_offline_job_definition"));
      assertTrue(sql.contains("CREATE TABLE yak_offline_job_execution"));
      assertTrue(sql.contains("CREATE TABLE yak_offline_execution_event"));
      assertFalse(sql.contains("CREATE TABLE yak_offline_engine_node"));
      assertFalse(sql.contains("CREATE TABLE yak_offline_job_version"));
      assertFalse(sql.contains("CREATE TABLE yak_offline_connector_schema"));
      assertFalse(sql.contains("CREATE TABLE yak_offline_worker_preflight"));
      assertFalse(sql.contains("CREATE TABLE yak_offline_alert_event"));
    }
  }
}
