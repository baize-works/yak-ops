package io.yak.ops.plugin.datasource.connection.api;

import java.io.Serializable;
import java.util.Objects;

public final class DataSourceId implements Serializable {
    private final String id;

    public DataSourceId(String id) { this.id = Objects.requireNonNull(id); }
    public String value() { return id; }
}
