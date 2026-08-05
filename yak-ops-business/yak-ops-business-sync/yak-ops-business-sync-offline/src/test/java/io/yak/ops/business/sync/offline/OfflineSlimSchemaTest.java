package io.yak.ops.business.sync.offline;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class OfflineSlimSchemaTest {
  @Test
  void rebuildsOnlyPhaseOneTables() throws Exception {
    String sql = read("/db/migration/yak-offline-sync/V1__create_offline_sync_core.sql");
    assertTrue(sql.contains("CREATE TABLE yak_offline_job_definition"));
    assertTrue(sql.contains("CREATE TABLE yak_offline_job_execution"));
    assertTrue(sql.contains("CREATE TABLE yak_offline_execution_event"));
    assertFalse(sql.contains("CREATE TABLE yak_offline_engine_node"));
    assertFalse(sql.contains("CREATE TABLE yak_offline_job_version"));
    assertFalse(sql.contains("CREATE TABLE yak_offline_connector_schema"));
    assertFalse(sql.contains("CREATE TABLE yak_offline_worker_preflight"));
    assertFalse(sql.contains("CREATE TABLE yak_offline_alert_event"));
  }

  @Test
  void addsDetailedSourceAndSinkExecutionMetrics() throws Exception {
    String sql =
        read(
            "/db/migration/yak-offline-sync/"
                + "V2__add_execution_sink_metrics.sql");
    assertTrue(sql.contains("sink_attempted_record_count"));
    assertTrue(sql.contains("sink_committed_record_count"));
    assertTrue(sql.contains("source_average_qps"));
    assertTrue(sql.contains("sink_average_qps"));
    assertTrue(sql.contains("failed_record_count"));
    assertTrue(sql.contains("skipped_record_count"));
    assertTrue(sql.contains("database_commit_millis"));
    assertTrue(sql.contains("sql_execution_millis"));
  }

  private String read(String path) throws Exception {
    try (InputStream input = getClass().getResourceAsStream(path)) {
      assertTrue(input != null);
      return new String(input.readAllBytes(), StandardCharsets.UTF_8);
    }
  }
}
