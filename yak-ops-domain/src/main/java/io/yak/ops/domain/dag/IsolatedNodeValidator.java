package io.yak.ops.domain.dag;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Validator that detects isolated nodes in a DAG.
 * <p>
 * An isolated node is a node that does not participate in any edge
 * (neither as a source nor as a target).
 */
public class IsolatedNodeValidator implements DagValidator {

    /**
     * Validate whether the DAG contains isolated nodes.
     *
     * @param nodes  list of node definitions
     * @param edges  list of edge definitions
     * @param result validation result container
     */
    @Override
    public void validate(List<ObjectNode> nodes, List<ObjectNode> edges, DagCheckResult result) {
        // If there are no nodes, the DAG is invalid
        if (nodes == null || nodes.isEmpty()) {
            result.addError("The DAG contains no nodes");
            return;
        }

        // Store IDs of nodes that are connected by at least one edge
        Set<String> connectedNodes = new HashSet<String>();

        // Collect all source and target node IDs from edges
        if (edges != null) {
            for (ObjectNode edge : edges) {
                String sourceId = getText(edge, "source");
                String targetId = getText(edge, "target");

                if (StringUtils.isNotBlank(sourceId)) {
                    connectedNodes.add(sourceId);
                }
                if (StringUtils.isNotBlank(targetId)) {
                    connectedNodes.add(targetId);
                }
            }
        }

        // Track IDs of isolated nodes
        List<String> isolatedNodeIds = new ArrayList<String>();

        // Identify nodes that do not appear in any edge
        for (ObjectNode node : nodes) {
            String nodeId = getText(node, "id");

            if (StringUtils.isNotBlank(nodeId) && !connectedNodes.contains(nodeId)) {
                isolatedNodeIds.add(nodeId);

                String nodeName = getText(node, "name");
                // Report isolated node with or without a name
                if (StringUtils.isNotBlank(nodeName)) {
                    result.addError(
                            String.format("Isolated node detected: ID=%s, Name=%s", nodeId, nodeName)
                    );
                } else {
                    result.addError(
                            String.format("Isolated node detected: ID=%s", nodeId)
                    );
                }
            }
        }

        // Special case:
        // If the graph contains only one node and no edges,
        // treat it as a warning instead of an error
        if (nodes.size() == 1 && isolatedNodeIds.size() == 1) {
            result.getErrors().removeIf(error -> error.contains("Isolated node"));
            result.addWarning("The graph contains only one node with no connecting edges");
        }
    }

    private String getText(ObjectNode node, String fieldName) {
        if (node == null || node.get(fieldName) == null || node.get(fieldName).isNull()) {
            return null;
        }
        return node.get(fieldName).asText();
    }
}
