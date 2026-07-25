package io.yak.ops.domain.dag;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Pure domain representation of a directed acyclic graph. */
public final class DagGraph {
    private final List<DagNode> nodes;
    private final List<DagEdge> edges;
    public DagGraph(List<DagNode> nodes, List<DagEdge> edges) {
        this.nodes = immutable(nodes);
        this.edges = immutable(edges);
    }
    private static <T> List<T> immutable(List<T> values) {
        return values == null ? Collections.<T>emptyList()
                : Collections.unmodifiableList(new ArrayList<T>(values));
    }
    public List<DagNode> getNodes() { return nodes; }
    public List<DagEdge> getEdges() { return edges; }
}
