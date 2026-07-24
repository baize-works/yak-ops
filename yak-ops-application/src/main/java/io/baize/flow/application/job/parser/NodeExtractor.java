package io.baize.flow.application.job.parser;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.HashSet;
import java.util.Set;

public class NodeExtractor {

    public Set<String> extractNodeTypes(ObjectNode jobJson) {

        Set<String> nodeTypes = new HashSet<String>();

        JsonNode nodesNode = jobJson.get("nodes");

        if (nodesNode == null || !nodesNode.isArray()) {
            return nodeTypes;
        }

        ArrayNode nodes = (ArrayNode) nodesNode;

        for (JsonNode node : nodes) {

            if (!node.isObject()) {
                continue;
            }

            ObjectNode nodeObj = (ObjectNode) node;

            JsonNode typeNode = nodeObj.get("type");

            if (typeNode != null && !typeNode.isNull()) {
                nodeTypes.add(typeNode.asText());
            }
        }

        return nodeTypes;
    }
}