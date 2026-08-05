package io.yak.ops.business.sync.offline.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionDetailVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionVO;
import org.junit.jupiter.api.Test;

class OfflineJobExecutionDetailSerializationTest {
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void keepsNestedExecutionAndExposesFlatCompatibilityFields() {
    OfflineJobExecutionVO execution =
        OfflineJobExecutionVO.builder()
            .id(2L)
            .status("SUCCEEDED")
            .sourceRecordCount(10000L)
            .sinkAttemptedRecordCount(10000L)
            .sinkSuccessRecordCount(10000L)
            .sinkCommittedRecordCount(10000L)
            .sourceAverageQps(14144.27157D)
            .sinkAverageQps(3369.27223D)
            .durationMillis(4420L)
            .build();
    OfflineJobExecutionDetailVO detail =
        OfflineJobExecutionDetailVO.builder()
            .execution(execution)
            .summary(execution)
            .build();

    JsonNode json = objectMapper.valueToTree(detail);

    assertEquals(2L, json.path("id").asLong());
    assertEquals("SUCCEEDED", json.path("status").asText());
    assertEquals(10000L, json.path("sinkSuccessRecordCount").asLong());
    assertEquals(3369.27223D, json.path("sinkAverageQps").asDouble(), 0.00001D);
    assertEquals(4420L, json.path("durationMillis").asLong());
    assertEquals(2L, json.path("execution").path("id").asLong());
    assertEquals(
        10000L,
        json.path("execution").path("sinkSuccessRecordCount").asLong());
  }
}
