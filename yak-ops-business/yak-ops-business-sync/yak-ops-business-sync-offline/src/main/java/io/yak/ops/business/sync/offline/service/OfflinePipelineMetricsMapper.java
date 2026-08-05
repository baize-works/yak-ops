package io.yak.ops.business.sync.offline.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/** 将 Link-Up Pipeline 嵌套指标转换为 Yak Ops 页面使用的表级扁平指标。 */
final class OfflinePipelineMetricsMapper {
  private OfflinePipelineMetricsMapper() {}

  static JsonNode flatten(ObjectMapper objectMapper, JsonNode payload) {
    ArrayNode result = objectMapper.createArrayNode();
    JsonNode pipelines = pipelines(payload);
    if (!pipelines.isArray()) {
      return result;
    }

    int index = 0;
    for (JsonNode pipeline : pipelines) {
      JsonNode source = pipeline.path("source");
      JsonNode sink = pipeline.path("sink");

      ObjectNode row = result.addObject();
      row.put(
          "id",
          text(
              pipeline,
              "pipelineId",
              text(pipeline, "dataSetId", String.valueOf(index))));
      row.put("pipelineId", text(pipeline, "pipelineId", null));
      row.put("dataSetId", text(pipeline, "dataSetId", null));
      row.put("status", text(pipeline, "status", "UNKNOWN"));
      row.put(
          "sourceTable",
          text(
              source,
              "table",
              text(pipeline, "dataSetId", "-")));
      row.put("sinkTable", text(sink, "table", "-"));
      row.put("sourceConnector", text(source, "connector", null));
      row.put("sinkConnector", text(sink, "connector", null));
      row.put("sourceTaskCount", number(source, "taskCount", 0L));
      row.put("sinkTaskCount", number(sink, "taskCount", 0L));
      row.put("readRowCount", number(source, "recordCount", 0L));
      row.put("writeRowCount", number(sink, "successRecordCount", 0L));
      row.put(
          "sinkAttemptedRecordCount",
          number(sink, "attemptedRecordCount", 0L));
      row.put(
          "sinkCommittedRecordCount",
          number(
              sink,
              "committedRecordCount",
              number(sink, "successRecordCount", 0L)));
      row.put("failedRecordCount", number(sink, "failedRecordCount", 0L));
      row.put(
          "unknownStateRecordCount",
          number(sink, "unknownStateRecordCount", 0L));
      row.put("readQps", decimal(source, "averageQps", 0D));
      row.put("writeQps", decimal(sink, "averageQps", 0D));
      row.put("sourceReadBytes", number(source, "readBytes", 0L));
      row.put("sinkWrittenBytes", number(sink, "writtenBytes", 0L));
      index++;
    }
    return result;
  }

  private static JsonNode pipelines(JsonNode payload) {
    if (payload == null || payload.isNull() || payload.isMissingNode()) {
      return com.fasterxml.jackson.databind.node.MissingNode.getInstance();
    }
    if (payload.isArray()) {
      return payload;
    }
    if (payload.path("pipelines").isArray()) {
      return payload.path("pipelines");
    }
    JsonNode data = payload.path("data");
    if (data.isArray()) {
      return data;
    }
    if (data.path("pipelines").isArray()) {
      return data.path("pipelines");
    }
    return com.fasterxml.jackson.databind.node.MissingNode.getInstance();
  }

  private static String text(JsonNode node, String field, String fallback) {
    JsonNode value = node == null ? null : node.get(field);
    if (value == null || value.isNull() || !value.isValueNode()) {
      return fallback;
    }
    String text = value.asText();
    return text == null || text.trim().isEmpty() ? fallback : text;
  }

  private static long number(JsonNode node, String field, long fallback) {
    JsonNode value = node == null ? null : node.get(field);
    return value == null || !value.isNumber()
        ? fallback
        : value.asLong(fallback);
  }

  private static double decimal(JsonNode node, String field, double fallback) {
    JsonNode value = node == null ? null : node.get(field);
    return value == null || !value.isNumber()
        ? fallback
        : value.asDouble(fallback);
  }
}
