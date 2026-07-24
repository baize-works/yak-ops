package io.baize.flow.infrastructure.verify.job;

import io.baize.flow.plugin.spi.enums.DbType;
import org.springframework.stereotype.Component;

@Component
public class ConnectivitySourcePluginNameResolver {

    public String resolvePluginName(DbType dbType) {
        return switch (dbType) {
            case MYSQL, POSTGRE_SQL, KINGBASE, DAMENG, ORACLE -> "Jdbc";
            case DORIS -> "Doris";
            default -> throw new IllegalArgumentException("暂不支持该数据源类型的 Source 插件名解析: " + dbType);
        };
    }
}
