package io.yak.ops.domain.dag;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;

/**
 * Assemble DAG json from whole-sync job definition.
 * <p>
 * Input  : whole-sync definition json
 * Output : dag json string
 */
@Slf4j
public final class WholeSyncDagAssembler {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final String FIELD_SOURCE = "source";
    private static final String FIELD_TARGET = "target";
    private static final String FIELD_TABLE_MATCH = "tableMatch";

    private WholeSyncDagAssembler() {
    }

    /**
     * Assemble whole-sync definition to DAG json.
     */
    public static String assemble(String definitionJson, String jobMode) {
        try {
            return doAssemble(definitionJson, jobMode);
        } catch (IllegalArgumentException e) {
            // 业务参数错误直接抛出
            throw e;
        } catch (Exception e) {
            log.error("Assemble whole-sync DAG failed", e);
            throw new IllegalStateException("Assemble whole-sync DAG failed", e);
        }
    }

    /* ====================== core ====================== */

    private static String doAssemble(String definitionJson, String jobMode) throws Exception {

        JsonNode root = MAPPER.readTree(definitionJson);

        long ts = System.currentTimeMillis();
        String sourceId = "source-" + ts;
        String sinkId = "sink-" + ts;

        ArrayNode nodes = MAPPER.createArrayNode();
        nodes.add(new SourceNodeBuilder().build(root, sourceId, jobMode));
        nodes.add(new SinkNodeBuilder().build(root, sinkId, jobMode));

        ArrayNode edges = MAPPER.createArrayNode();
        edges.add(EdgeBuilder.build(sourceId, sinkId));

        ObjectNode dag = MAPPER.createObjectNode();
        dag.set("nodes", nodes);
        dag.set("edges", edges);

        return MAPPER.writeValueAsString(dag);
    }

    /* ====================== common utils ====================== */

    private static JsonNode requireNode(JsonNode parent, String fieldName) {
        JsonNode node = parent.get(fieldName);
        if (node == null || node.isNull()) {
            throw new IllegalArgumentException(
                    "Required node '" + fieldName + "' is missing"
            );
        }
        return node;
    }

    private static String requireText(JsonNode node, String fieldName) {
        JsonNode valueNode = node.get(fieldName);
        if (valueNode == null || valueNode.asText().trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Required field '" + fieldName + "' is empty"
            );
        }
        return valueNode.asText();
    }

    /* ====================== abstract node builder ====================== */

    abstract static class AbstractNodeBuilder {

        abstract String nodeType();

        abstract JsonNode extractNode(JsonNode root);

        abstract void fillCustomFields(
                ObjectNode data,
                JsonNode nodeData,
                JsonNode root
        );

        ObjectNode build(JsonNode root, String nodeId, String jobMode) {

            JsonNode tableMatch = requireNode(root, FIELD_TABLE_MATCH);
            JsonNode nodeData = extractNode(root);

            ObjectNode node = MAPPER.createObjectNode();
            node.put("id", nodeId);

            ObjectNode data = MAPPER.createObjectNode();

            data.put("nodeType", nodeType());
            data.put("dbType", requireText(nodeData, "dbType"));
            data.put("connectorType", requireText(nodeData, "connectorType"));
            data.put("mode", requireText(tableMatch, "mode"));
            data.put("jobMode", jobMode);
            data.put("wholeSync", true);
            data.put("pluginName", requireText(nodeData, "pluginName"));
            JsonNode tables = tableMatch.get("tables");
            if (tables != null && tables.isArray()) {
                data.set("table_list", tables);
            }

            fillCustomFields(data, nodeData, root);

            appendExtraParams(data, nodeData, nodeType());
            node.set("data", data);

            return node;
        }
    }

    private static void appendOptionalText(ObjectNode data, JsonNode source, String fieldName) {
        JsonNode value = source.get(fieldName);
        if (value != null && !value.isNull() && !value.asText().trim().isEmpty()) {
            data.put(fieldName, value.asText());
        }
    }

    private static void appendExtraParams(
            ObjectNode data,
            JsonNode parentNode,
            String nodeType
    ) {
        JsonNode extraParams = parentNode.get("extraParams");

        if (extraParams == null || !extraParams.isArray()) {
            return;
        }

        ObjectNode paramsObject = MAPPER.createObjectNode();

        for (JsonNode param : extraParams) {
            String key = requireText(param, "key");
            String value = requireText(param, "value");

            paramsObject.put(key, value);
        }

        data.set("extraParams", paramsObject);
    }

    /* ====================== source builder ====================== */

    static class SourceNodeBuilder extends AbstractNodeBuilder {

        @Override
        String nodeType() {
            return "source";
        }

        @Override
        JsonNode extractNode(JsonNode root) {
            return requireNode(root, FIELD_SOURCE);
        }

        @Override
        void fillCustomFields(
                ObjectNode data,
                JsonNode source,
                JsonNode root
        ) {

            JsonNode tableMatch = requireNode(root, FIELD_TABLE_MATCH);

            data.put("sourceId", requireText(source, "datasourceId"));

            JsonNode tables = tableMatch.get("tables");
            if (tables != null && tables.isArray()) {
                data.set("table_list", tables);
            }

            data.put("fetchSize", requireText(source, "fetchSize"));
            data.put("splitSize", requireText(source, "splitSize"));

            appendOptionalText(data, source, "server-id");
            appendOptionalText(data, source, "serverIdMode");

            data.put("keyword",
                    tableMatch.path("keyword").asText(""));
        }
    }

    /* ====================== sink builder ====================== */

    static class SinkNodeBuilder extends AbstractNodeBuilder {

        @Override
        String nodeType() {
            return "sink";
        }

        @Override
        JsonNode extractNode(JsonNode root) {
            return requireNode(root, FIELD_TARGET);
        }

        @Override
        void fillCustomFields(
                ObjectNode data,
                JsonNode target,
                JsonNode root
        ) {
            data.put("sinkId", requireText(target, "datasourceId"));

            data.put("dataSaveMode", requireText(target, "dataSaveMode"));
            data.put("batchSize", requireText(target, "batchSize"));
            data.put("schemaSaveMode", requireText(target, "schemaSaveMode"));
            data.put("enableUpsert", requireText(target, "enableUpsert"));
            data.put("fieldIde", requireText(target, "fieldIde"));

        }
    }

    /* ====================== edge builder ====================== */

    static class EdgeBuilder {

        static ObjectNode build(String sourceId, String sinkId) {
            ObjectNode edge = MAPPER.createObjectNode();
            edge.put("id", "edge-" + sourceId + "-" + sinkId);
            edge.put("source", sourceId);
            edge.put("target", sinkId);
            return edge;
        }
    }
}
