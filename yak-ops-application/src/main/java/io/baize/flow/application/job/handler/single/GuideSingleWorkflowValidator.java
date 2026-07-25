package io.baize.flow.application.job.handler.single;


import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class GuideSingleWorkflowValidator {

    public void validate(Object workflowObj) {
        Map<String, Object> workflow = WorkflowNodeHelper.safeMap(workflowObj);

        List<Map<String, Object>> nodes = WorkflowNodeHelper.getNodes(workflow);
        List<Map<String, Object>> edges = WorkflowNodeHelper.getEdges(workflow);

        validateNodes(nodes);
        validateEdges(edges);

        List<Map<String, Object>> sourceNodes = WorkflowNodeHelper.findNodesByType(nodes, "source");
        List<Map<String, Object>> sinkNodes = WorkflowNodeHelper.findNodesByType(nodes, "sink");

        validateSourceAndSink(sourceNodes, sinkNodes);

        Set<String> nodeIds = WorkflowNodeHelper.collectNodeIds(nodes);
        validateEdgeReferences(edges, nodeIds);

        String sourceNodeId = WorkflowNodeHelper.getNodeId(sourceNodes.get(0));
        String sinkNodeId = WorkflowNodeHelper.getNodeId(sinkNodes.get(0));

        if (sourceNodeId.isEmpty() || sinkNodeId.isEmpty()) {
            throw new IllegalArgumentException("Source or sink node id can not be empty");
        }

        if (sourceNodeId.equals(sinkNodeId)) {
            throw new IllegalArgumentException("Source node and sink node can not be the same node");
        }

        if (!isReachable(sourceNodeId, sinkNodeId, edges)) {
            throw new IllegalArgumentException("Source node and sink node are not connected");
        }
    }

    private void validateNodes(List<Map<String, Object>> nodes) {
        if (nodes.isEmpty()) {
            throw new IllegalArgumentException("Workflow nodes can not be empty");
        }
        if (nodes.size() < 2) {
            throw new IllegalArgumentException("Guide single workflow must contain at least 2 nodes");
        }
    }

    private void validateEdges(List<Map<String, Object>> edges) {
        if (edges.isEmpty()) {
            throw new IllegalArgumentException("Workflow edges can not be empty");
        }
    }

    private void validateSourceAndSink(
            List<Map<String, Object>> sourceNodes,
            List<Map<String, Object>> sinkNodes) {

        if (sourceNodes.isEmpty()) {
            throw new IllegalArgumentException("Workflow must contain one source node");
        }
        if (sinkNodes.isEmpty()) {
            throw new IllegalArgumentException("Workflow must contain one sink node");
        }
        if (sourceNodes.size() > 1) {
            throw new IllegalArgumentException("Guide single workflow only supports one source node");
        }
        if (sinkNodes.size() > 1) {
            throw new IllegalArgumentException("Guide single workflow only supports one sink node");
        }
    }

    private void validateEdgeReferences(List<Map<String, Object>> edges, Set<String> nodeIds) {
        for (Map<String, Object> edge : edges) {
            String source = WorkflowNodeHelper.getString(edge, "source");
            String target = WorkflowNodeHelper.getString(edge, "target");

            if (source.isEmpty() || target.isEmpty()) {
                throw new IllegalArgumentException("Edge source or target can not be empty");
            }

            if (!nodeIds.contains(source) || !nodeIds.contains(target)) {
                throw new IllegalArgumentException("Edge references non-existent node");
            }
        }
    }

    private boolean isReachable(String sourceNodeId, String sinkNodeId, List<Map<String, Object>> edges) {
        Map<String, List<String>> graph = new HashMap<>();
        for (Map<String, Object> edge : edges) {
            String source = WorkflowNodeHelper.getString(edge, "source");
            String target = WorkflowNodeHelper.getString(edge, "target");
            if (source.isEmpty() || target.isEmpty()) {
                continue;
            }
            graph.computeIfAbsent(source, k -> new ArrayList<>()).add(target);
        }

        Deque<String> queue = new ArrayDeque<>();
        Set<String> visited = new HashSet<>();
        queue.offer(sourceNodeId);
        visited.add(sourceNodeId);

        while (!queue.isEmpty()) {
            String current = queue.poll();
            if (sinkNodeId.equals(current)) {
                return true;
            }

            for (String next : graph.getOrDefault(current, java.util.Collections.emptyList())) {
                if (visited.add(next)) {
                    queue.offer(next);
                }
            }
        }

        return false;
    }
}
