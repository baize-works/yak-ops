package io.yak.ops.dao.plugin.api.monitor;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import io.yak.ops.plugin.spi.enums.DbType;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatabaseMetrics {

    private DbType dbType;

    private DatabaseHealthStatus state;

    private long maxConnections;

    private long maxUsedConnections;

    private long threadsConnections;

    private long threadsRunningConnections;

    private Date date;

    public enum DatabaseHealthStatus {
        YES,
        NO
    }

}
