package io.baize.flow.infrastructure.verify.job;

import io.baize.flow.plugin.spi.enums.DbType;
import org.springframework.stereotype.Component;

@Component
public class ConnectivitySourcePluginNameResolver {

    public String resolvePluginName(DbType dbType) {
        switch (dbType) {
            case MYSQL:
            case POSTGRE_SQL:
            case KINGBASE:
            case DAMENG:
            case ORACLE:
                return "Jdbc";
            case DORIS:
                return "Doris";
            default:
                throw new IllegalArgumentException("暂不支持该数据源类型的 Source 插件名解析: " + dbType);
        }
    }
}
