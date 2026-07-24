package io.baize.flow.domain.dag;

import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * Validator to detect cycles in a Directed Acyclic Graph (DAG).
 * <p>
 * This implementation uses Topological Sort (Kahn's algorithm).
 * If not all nodes can be visited during sorting, a cycle exists.
 */
@Slf4j
public class CycleDetectionValidator implements DagValidator {

    /**
     * JSON key for node ID
     */
    private static final String NODE_ID_KEY = "id";
    /**
     * JSON key for edge source
     */
    private static final String EDGE_SOURCE_KEY = "source";
    /**
     * JSON key for edge target
     */
    private static final String EDGE_TARGET_KEY = "target";

    /**
     * Validate whether the DAG contains a cycle.
     *
     * @param nodes  list of node definitions
     * @param edges  list of edge definitions
     * @param result validation result container
     */
    @Override
    public void validate(List<ObjectNode> nodes, List<ObjectNode> edges, DagCheckResult result) {
        if (nodes == null || edges == null) {
            return;
        }

        if (nodes.isEmpty() || edges.isEmpty()) {
            // Empty DAG cannot have cycles
            return;
        }

        try {
            boolean hasCycle = hasCycleByTopologicalSort(nodes, edges);
            if (hasCycle) {
                result.addError("The DAG contains a cycle. Please check the edge connections.");
                result.setValid(false);
            }
        } catch (Exception e) {
            log.error("Error occurred during cycle detection", e);
            result.addWarning("Cycle detection failed: " + e.getMessage());
        }
    }

    /**
     * Detect cycles using topological sorting (Kahn's algorithm).
     *
     * @param nodes list of nodes
     * @param edges list of edges
     * @return true if a cycle exists, false otherwise
     */
    private boolean hasCycleByTopologicalSort(List<ObjectNode> nodes, List<ObjectNode> edges) {
        // Build adjacency list: node -> list of outgoing neighbors
        Map<String, List<String>> adjacencyList = new HashMap<String, List<String>>();
        // Map to store in-degree for each node: node -> number of incoming edges
        Map<String, Integer> inDegreeMap = new HashMap<String, Integer>();

        // Initialize adjacency list and in-degree map
        for (ObjectNode node : nodes) {
            String nodeId = getText(node, NODE_ID_KEY);
            if (nodeId == null) {
                continue;
            }
            adjacencyList.putIfAbsent(nodeId, new ArrayList<String>());
            inDegreeMap.putIfAbsent(nodeId, 0);
        }

        // Build the graph from edges
        for (ObjectNode edge : edges) {
            String source = getText(edge, EDGE_SOURCE_KEY);
            String target = getText(edge, EDGE_TARGET_KEY);

            if (source != null && target != null) {
                adjacencyList.computeIfAbsent(source, k -> new ArrayList<String>()).add(target);
                inDegreeMap.put(target, inDegreeMap.getOrDefault(target, 0) + 1);
                inDegreeMap.putIfAbsent(source, 0);
            }
        }

        // Queue for nodes with zero in-degree
        Queue<String> queue = new LinkedList<String>();
        for (Map.Entry<String, Integer> entry : inDegreeMap.entrySet()) {
            if (entry.getValue() == 0) {
                queue.offer(entry.getKey());
            }
        }

        int visitedCount = 0;
        List<String> topologicalOrder = new ArrayList<String>();

        // Perform topological sort
        while (!queue.isEmpty()) {
            String current = queue.poll();
            topologicalOrder.add(current);
            visitedCount++;

            List<String> neighbors = adjacencyList.get(current);
            if (neighbors != null) {
                for (String neighbor : neighbors) {
                    int newInDegree = inDegreeMap.get(neighbor) - 1;
                    inDegreeMap.put(neighbor, newInDegree);
                    if (newInDegree == 0) {
                        queue.offer(neighbor);
                    }
                }
            }
        }

        boolean hasCycle = visitedCount != nodes.size();

        if (hasCycle) {
            log.warn("Cycle detected: visited {}/{} nodes", visitedCount, nodes.size());
            log.warn("Topological order result: {}", topologicalOrder);

            List<String> cycleNodes = findCycleNodes(adjacencyList, inDegreeMap);
            if (!cycleNodes.isEmpty()) {
                log.warn("Possible cycle nodes: {}", cycleNodes);
            }
        }

        return hasCycle;
    }

    /**
     * Identify nodes that may be part of a cycle.
     * <p>
     * Nodes with remaining in-degree > 0 after topological sorting
     * are likely involved in a cycle.
     *
     * @param adjacencyList adjacency list of the graph
     * @param inDegreeMap   final in-degree map
     * @return list of possible cycle nodes
     */
    private List<String> findCycleNodes(Map<String, List<String>> adjacencyList,
                                        Map<String, Integer> inDegreeMap) {
        List<String> cycleNodes = new ArrayList<String>();

        for (Map.Entry<String, Integer> entry : inDegreeMap.entrySet()) {
            String node = entry.getKey();
            int inDegree = entry.getValue();
            if (inDegree > 0) {
                List<String> neighbors = adjacencyList.get(node);
                if (neighbors != null && !neighbors.isEmpty()) {
                    cycleNodes.add(node);
                }
            }
        }

        return cycleNodes;
    }

    private String getText(ObjectNode node, String fieldName) {
        if (node == null || node.get(fieldName) == null || node.get(fieldName).isNull()) {
            return null;
        }
        return node.get(fieldName).asText();
    }
}