package io.yak.ops.domain.dag;

/** A directed connection between two DAG nodes. */
public final class DagEdge {
    private final String id;
    private final String source;
    private final String target;
    public DagEdge(String id, String source, String target) {
        this.id = id; this.source = source; this.target = target;
    }
    public String getId() { return id; }
    public String getSource() { return source; }
    public String getTarget() { return target; }
}
