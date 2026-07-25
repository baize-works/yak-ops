package io.yak.ops.domain.dag;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** A framework-independent DAG node. */
public final class DagNode {
    private final String id;
    private final String name;
    private final String type;
    private final Map<String, Object> attributes;

    public DagNode(String id, String name, String type, Map<String, Object> attributes) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.attributes = attributes == null ? Collections.<String, Object>emptyMap()
                : Collections.unmodifiableMap(new LinkedHashMap<String, Object>(attributes));
    }
    public String getId() { return id; }
    public String getName() { return name; }
    public String getType() { return type; }
    public Map<String, Object> getAttributes() { return attributes; }
}
