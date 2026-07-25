package io.yak.ops.dao.model.query;

import io.yak.ops.common.enums.EnvironmentEnum;
import io.yak.ops.plugin.spi.enums.DbType;
import lombok.Data;

/** Persistence pagination criteria for data sources. */
@Data
public class DataSourceQuery {
    private String name;
    private DbType dbType;
    private EnvironmentEnum environment;
    private Integer pageNo = 1;
    private Integer pageSize = 10;
}
