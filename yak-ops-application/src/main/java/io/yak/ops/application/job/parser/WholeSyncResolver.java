package io.yak.ops.application.job.parser;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.dao.entity.BatchJobDefinition;

import java.util.ArrayList;
import java.util.List;

public class WholeSyncResolver {

    public void resolve(BatchJobDefinition po, ObjectNode jobJson) {

        ObjectNode source = getObject(jobJson, "source");
        ObjectNode target = getObject(jobJson, "target");
        ObjectNode tableMatch = getObject(jobJson, "tableMatch");

        if (source == null || target == null || tableMatch == null) {
            throw new IllegalArgumentException("Invalid wholeSync job structure");
        }

        po.setSourceType(getText(source, "dbType"));
        po.setSinkType(getText(target, "dbType"));

        JsonNode tables = tableMatch.get("tables");

        if (tables == null || !tables.isArray() || tables.isEmpty()) {
            return;
        }

        List<String> tableList = new ArrayList<String>();

        for (JsonNode tableNode : tables) {
            if (tableNode == null || tableNode.isNull()) {
                continue;
            }

            String tableName = tableNode.asText(null);
            if (tableName != null) {
                tableList.add(tableName);
            }
        }

        if (tableList.isEmpty()) {
            return;
        }

        String tablesStr = String.join(",", tableList);

        po.setSourceTable(tablesStr);
        po.setSinkTable(tablesStr);
    }

    private ObjectNode getObject(ObjectNode node, String field) {
        if (node == null || node.get(field) == null || !node.get(field).isObject()) {
            return null;
        }
        return (ObjectNode) node.get(field);
    }

    private String getText(ObjectNode node, String field) {
        if (node == null || node.get(field) == null || node.get(field).isNull()) {
            return null;
        }
        return node.get(field).asText();
    }
}
