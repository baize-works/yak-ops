package org.apache.seatunnel.plugin.datasource.api.option;

import lombok.Data;

import java.io.Serializable;
import java.util.List;

@Data
public class JdbcSourceTableConfig implements Serializable {
    private String table;
    private List<String> primaryKeys;
    private String snapshotSplitColumn;
}
