package io.yak.ops.business.sync.offline.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class OfflinePipelineMetricsMapperTest {
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void flattensSourceSinkAndTableDdl() throws Exception {
    JsonNode payload =
        objectMapper.readTree(
            """
            [
              {
                "pipelineId": "pipeline-test1.t_test_1w",
                "dataSetId": "test1.t_test_1w",
                "status": "SUCCEEDED",
                "source": {
                  "connector": "jdbc",
                  "table": "test1.t_test_1w",
                  "taskCount": 1,
                  "recordCount": 10000,
                  "readBytes": 1024,
                  "averageQps": 14144.27157
                },
                "sink": {
                  "connector": "jdbc",
                  "table": "test1234123",
                  "taskCount": 1,
                  "attemptedRecordCount": 10000,
                  "successRecordCount": 10000,
                  "committedRecordCount": 10000,
                  "failedRecordCount": 0,
                  "unknownStateRecordCount": 0,
                  "writtenBytes": 2048,
                  "averageQps": 3369.27223
                },
                "tableDdl": {
                  "dialect": "MYSQL",
                  "sourceTable": "test1.t_test_1w",
                  "targetTable": "test1234123",
                  "createTableSql": "CREATE TABLE `test1234123` (`id` BIGINT NOT NULL);",
                  "executed": true,
                  "status": "SUCCEEDED",
                  "reason": "TARGET_TABLE_CREATED",
                  "durationMillis": 12
                }
              }
            ]
            """);

    JsonNode result = OfflinePipelineMetricsMapper.flatten(objectMapper, payload);

    assertEquals(1, result.size());
    JsonNode row = result.get(0);
    assertEquals("test1.t_test_1w", row.path("sourceTable").asText());
    assertEquals("test1234123", row.path("sinkTable").asText());
    assertEquals(10000L, row.path("readRowCount").asLong());
    assertEquals(10000L, row.path("writeRowCount").asLong());
    assertEquals(10000L, row.path("sinkAttemptedRecordCount").asLong());
    assertEquals(10000L, row.path("sinkCommittedRecordCount").asLong());
    assertEquals(14144.27157D, row.path("readQps").asDouble(), 0.00001D);
    assertEquals(3369.27223D, row.path("writeQps").asDouble(), 0.00001D);
    assertEquals(1024L, row.path("sourceReadBytes").asLong());
    assertEquals(2048L, row.path("sinkWrittenBytes").asLong());
    assertEquals("SUCCEEDED", row.path("status").asText());
    assertEquals("MYSQL", row.path("ddlDialect").asText());
    assertEquals(
        "CREATE TABLE `test1234123` (`id` BIGINT NOT NULL);",
        row.path("createTableSql").asText());
    assertTrue(row.path("ddlExecuted").asBoolean());
    assertEquals("SUCCEEDED", row.path("ddlStatus").asText());
    assertEquals("TARGET_TABLE_CREATED", row.path("ddlReason").asText());
    assertEquals(12L, row.path("ddlDurationMillis").asLong());
    assertEquals(
        "CREATE TABLE `test1234123` (`id` BIGINT NOT NULL);",
        row.path("tableDdl").path("createTableSql").asText());
  }

  @Test
  void acceptsWrappedPipelinePayloadWithoutDdl() throws Exception {
    JsonNode payload =
        objectMapper.readTree(
            """
            {
              "pipelines": [
                {
                  "dataSetId": "orders",
                  "source": {"recordCount": 3},
                  "sink": {"successRecordCount": 2}
                }
              ]
            }
            """);

    JsonNode result = OfflinePipelineMetricsMapper.flatten(objectMapper, payload);

    assertEquals(1, result.size());
    assertEquals("orders", result.get(0).path("sourceTable").asText());
    assertEquals(3L, result.get(0).path("readRowCount").asLong());
    assertEquals(2L, result.get(0).path("writeRowCount").asLong());
    assertFalse(result.get(0).path("ddlExecuted").asBoolean());
    assertTrue(result.get(0).path("createTableSql").isNull());
  }
}
