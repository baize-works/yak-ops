package io.yak.ops.domain.dag;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Detects nodes which participate in no edge. */
public class IsolatedNodeValidator implements DagValidator {
    @Override
    public void validate(DagGraph graph, DagCheckResult result) {
        if (graph == null || graph.getNodes().isEmpty()) { result.addError("The DAG contains no nodes"); return; }
        Set<String> connected = new HashSet<String>();
        for (DagEdge edge : graph.getEdges()) {
            if (notBlank(edge.getSource())) connected.add(edge.getSource());
            if (notBlank(edge.getTarget())) connected.add(edge.getTarget());
        }
        List<String> isolated = new ArrayList<String>();
        for (DagNode node : graph.getNodes()) {
            if (notBlank(node.getId()) && !connected.contains(node.getId())) {
                isolated.add(node.getId());
                result.addError("Isolated node detected: ID=" + node.getId()
                        + (notBlank(node.getName()) ? ", Name=" + node.getName() : ""));
            }
        }
        if (graph.getNodes().size() == 1 && isolated.size() == 1) {
            java.util.Iterator<String> iterator = result.getErrors().iterator();
            while (iterator.hasNext()) if (iterator.next().contains("Isolated node")) iterator.remove();
            result.setValid(true);
            result.addWarning("The graph contains only one node with no connecting edges");
        }
    }
    private boolean notBlank(String value) { return value != null && !value.trim().isEmpty(); }
}
