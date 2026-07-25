package io.yak.ops.domain.dag;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.lang3.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Validator that restricts Transform nodes to a single connection
 * on each side of the graph.
 * <p>
 * Rules:
 * <ul>
 *   <li>A Transform node may have at most one incoming edge (left side)</li>
 *   <li>A Transform node may have at most one outgoing edge (right side)</li>
 * </ul>
 */
public class TransformSingleConnectionValidator implements DagValidator {

    /**
     * Validate that each Transform node has at most one incoming
     * and one outgoing connection.
     *
     * @param nodes  list of node definitions
     * @param edges  list of edge definitions
     * @param result validation result container
     */
    @Override
    public void validate(List<ObjectNode> nodes, List<ObjectNode> edges, DagCheckResult result) {
        if (nodes == null || nodes.isEmpty() || edges == null || edges.isEmpty()) {
            return;
        }

        // Count incoming edges for each node
        Map<String, Integer> inDegreeMap = new HashMap<String, Integer>();
        // Count outgoing edges for each node
        Map<String, Integer> outDegreeMap = new HashMap<String, Integer>();

        for (ObjectNode edge : edges) {
            String source = getText(edge, "source");
            String target = getText(edge, "target");

            if (StringUtils.isNotBlank(source)) {
                outDegreeMap.put(source, outDegreeMap.getOrDefault(source, 0) + 1);
            }

            if (StringUtils.isNotBlank(target)) {
                inDegreeMap.put(target, inDegreeMap.getOrDefault(target, 0) + 1);
            }
        }

        // Validate Transform nodes only
        for (ObjectNode node : nodes) {

            if (!isTransformNode(node)) {
                continue;
            }

            String nodeId = getText(node, "id");

            ObjectNode data = getObject(node, "data");

            String nodeName = getText(data, "title");

            int inDegree = inDegreeMap.getOrDefault(nodeId, 0);
            int outDegree = outDegreeMap.getOrDefault(nodeId, 0);

            if (inDegree > 1) {
                result.addError(
                        String.format(
                                "Transform node has more than one incoming connection (left side): ID=%s, Name=%s",
                                nodeId,
                                defaultName(nodeName)
                        )
                );
            }

            if (outDegree > 1) {
                result.addError(
                        String.format(
                                "Transform node has more than one outgoing connection (right side): ID=%s, Name=%s",
                                nodeId,
                                defaultName(nodeName)
                        )
                );
            }
        }
    }

    /**
     * Determine whether the given node is a Transform node.
     */
    private boolean isTransformNode(ObjectNode node) {

        ObjectNode data = getObject(node, "data");

        if (data == null) {
            return false;
        }

        String nodeType = getText(data, "nodeType");

        return "transform".equalsIgnoreCase(nodeType);
    }

    /**
     * Provide a default display name when node name is missing.
     */
    private String defaultName(String name) {
        return StringUtils.isNotBlank(name) ? name : "N/A";
    }

    private String getText(ObjectNode node, String field) {

        if (node == null || node.get(field) == null || node.get(field).isNull()) {
            return null;
        }

        return node.get(field).asText();
    }

    private ObjectNode getObject(ObjectNode node, String field) {

        if (node == null || node.get(field) == null || !node.get(field).isObject()) {
            return null;
        }

        return (ObjectNode) node.get(field);
    }
}
