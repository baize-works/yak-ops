package io.yak.ops.domain.dag;

import java.util.HashSet;
import java.util.Set;

/** Ensures every edge endpoint references an existing node. */
public class GraphConnectivityValidator implements DagValidator {
    @Override
    public void validate(DagGraph graph, DagCheckResult result) {
        if (graph == null || graph.getNodes().isEmpty() || graph.getEdges().isEmpty()) return;
        Set<String> ids = new HashSet<String>();
        for (DagNode node : graph.getNodes()) if (notBlank(node.getId())) ids.add(node.getId());
        for (DagEdge edge : graph.getEdges()) {
            if (notBlank(edge.getSource()) && !ids.contains(edge.getSource()))
                result.addError("Edge references a non-existent source node: " + edge.getSource());
            if (notBlank(edge.getTarget()) && !ids.contains(edge.getTarget()))
                result.addError("Edge references a non-existent target node: " + edge.getTarget());
        }
    }
    private boolean notBlank(String value) { return value != null && !value.trim().isEmpty(); }
}
