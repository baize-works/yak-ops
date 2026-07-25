package io.yak.ops.common.enums;

public enum NodeType {
    SOURCE("source"),
    TRANSFORM("transform"),
    SINK("sink");

    private final String type;

    NodeType(String type) {
        this.type = type;
    }

    public String getType() {
        return type;
    }
}
