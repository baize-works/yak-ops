package io.yak.ops.domain.dag;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Queue;

/** Detects cycles using Kahn's topological-sort algorithm. */
public class CycleDetectionValidator implements DagValidator {
    @Override
    public void validate(DagGraph graph, DagCheckResult result) {
        if (graph == null || graph.getNodes().isEmpty() || graph.getEdges().isEmpty()) return;
        Map<String,List<String>> adjacency = new HashMap<String,List<String>>();
        Map<String,Integer> degree = new HashMap<String,Integer>();
        for (DagNode node : graph.getNodes()) { adjacency.put(node.getId(), new ArrayList<String>()); degree.put(node.getId(), 0); }
        for (DagEdge edge : graph.getEdges()) {
            if (edge.getSource() == null || edge.getTarget() == null) continue;
            List<String> targets = adjacency.get(edge.getSource());
            if (targets == null) { targets = new ArrayList<String>(); adjacency.put(edge.getSource(), targets); }
            targets.add(edge.getTarget());
            Integer current = degree.get(edge.getTarget()); degree.put(edge.getTarget(), current == null ? 1 : current + 1);
            if (!degree.containsKey(edge.getSource())) degree.put(edge.getSource(), 0);
        }
        Queue<String> queue = new LinkedList<String>();
        for (Map.Entry<String,Integer> entry : degree.entrySet()) if (entry.getValue() == 0) queue.offer(entry.getKey());
        int visited = 0;
        while (!queue.isEmpty()) {
            String current = queue.poll(); visited++;
            List<String> targets = adjacency.get(current);
            if (targets == null) continue;
            for (String target : targets) { int value = degree.get(target) - 1; degree.put(target,value); if (value == 0) queue.offer(target); }
        }
        if (visited != graph.getNodes().size()) result.addError("The DAG contains a cycle. Please check the edge connections.");
    }
}
