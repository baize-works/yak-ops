package io.baize.flow.infrastructure.verify.job;

import io.baize.flow.plugin.spi.enums.DbType;
import org.springframework.stereotype.Component;

@Component
public class ConnectivitySourceBuilderResolver {

    public String resolveBuilderKey(DbType dbType) {
        return switch (dbType) {
            case MYSQL -> "JDBC-MYSQL";
            case POSTGRE_SQL -> "JDBC-POSTGRESQL";
            case KINGBASE -> "JDBC-KINGBASE";
            case DAMENG -> "JDBC-DAMENG";
            case ORACLE -> "JDBC-ORACLE";
            case DORIS -> "DORIS";
            default -> throw new IllegalArgumentException("暂不支持该数据源类型的 Source Builder 解析: " + dbType);
        };
    }
}
