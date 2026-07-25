package io.baize.flow.domain.dag;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.lang3.StringUtils;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Validator that checks graph connectivity.
 *
 * <p>This validator ensures that all edges reference existing nodes.
 * If an edge points to a non-existent source or target node,
 * the DAG is considered invalid.</p>
 */
public class GraphConnectivityValidator implements DagValidator {

    @Override
    public void validate(List<ObjectNode> nodes, List<ObjectNode> edges, DagCheckResult result) {

        // Skip validation if nodes or edges are empty
        if (nodes == null || nodes.isEmpty() || edges == null || edges.isEmpty()) {
            return;
        }

        // Collect all node ids
        Set<String> nodeIds = new HashSet<>();
        for (ObjectNode node : nodes) {
            String nodeId = node.path("id").asText(null);
            if (StringUtils.isNotBlank(nodeId)) {
                nodeIds.add(nodeId);
            }
        }

        // Validate edges
        for (ObjectNode edge : edges) {

            String sourceId = edge.path("source").asText(null);
            String targetId = edge.path("target").asText(null);

            if (StringUtils.isNotBlank(sourceId) && !nodeIds.contains(sourceId)) {
                result.addError(
                        String.format("Edge references a non-existent source node: %s", sourceId)
                );
            }

            if (StringUtils.isNotBlank(targetId) && !nodeIds.contains(targetId)) {
                result.addError(
                        String.format("Edge references a non-existent target node: %s", targetId)
                );
            }
        }
    }
}
