package io.yak.ops.domain.dag;

import java.util.HashMap;
import java.util.Map;

/** Restricts transform nodes to one incoming and one outgoing edge. */
public class TransformSingleConnectionValidator implements DagValidator {
    @Override
    public void validate(DagGraph graph, DagCheckResult result) {
        if (graph == null) return;
        Map<String, Integer> incoming = new HashMap<String, Integer>();
        Map<String, Integer> outgoing = new HashMap<String, Integer>();
        for (DagEdge edge : graph.getEdges()) {
            increment(outgoing, edge.getSource()); increment(incoming, edge.getTarget());
        }
        for (DagNode node : graph.getNodes()) {
            if (!"transform".equalsIgnoreCase(node.getType())) continue;
            int in = count(incoming, node.getId()), out = count(outgoing, node.getId());
            String name = notBlank(node.getName()) ? node.getName() : "N/A";
            if (in > 1) result.addError(String.format("Transform node has more than one incoming connection (left side): ID=%s, Name=%s", node.getId(), name));
            if (out > 1) result.addError(String.format("Transform node has more than one outgoing connection (right side): ID=%s, Name=%s", node.getId(), name));
        }
    }
    private void increment(Map<String,Integer> counts, String id) { if (notBlank(id)) counts.put(id, count(counts,id)+1); }
    private int count(Map<String,Integer> counts, String id) { Integer value=counts.get(id); return value == null ? 0 : value; }
    private boolean notBlank(String value) { return value != null && !value.trim().isEmpty(); }
}
