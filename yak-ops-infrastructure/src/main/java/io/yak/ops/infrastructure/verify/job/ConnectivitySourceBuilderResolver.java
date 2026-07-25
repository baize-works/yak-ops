package io.yak.ops.infrastructure.verify.job;

import io.yak.ops.plugin.spi.enums.DbType;
import org.springframework.stereotype.Component;

@Component
public class ConnectivitySourceBuilderResolver {

    public String resolveBuilderKey(DbType dbType) {
        switch (dbType) {
            case MYSQL:
                return "JDBC-MYSQL";
            case POSTGRE_SQL:
                return "JDBC-POSTGRESQL";
            case KINGBASE:
                return "JDBC-KINGBASE";
            case DAMENG:
                return "JDBC-DAMENG";
            case ORACLE:
                return "JDBC-ORACLE";
            case DORIS:
                return "DORIS";
            default:
                throw new IllegalArgumentException("暂不支持该数据源类型的 Source Builder 解析: " + dbType);
        }
    }
}
