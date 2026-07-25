package org.apache.seatunnel.plugin.datasource.pgsql.param;

import org.apache.commons.collections4.MapUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcParamConverter;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.plugin.spi.datasource.BaseConnectionParam;
import io.yak.ops.plugin.spi.enums.DbType;

import java.util.Map;
import java.util.stream.Collectors;

public class PgSQLParamConverter implements JdbcParamConverter {

    private static final String DEFAULT_DRIVER = "org.postgresql.Driver";

    @Override
    public BaseConnectionParam createConnectionParams(String connectionJson) {
        PgSQLConnectionParam pgSQLConnectionParam =
                JSONUtils.parseObject(connectionJson, PgSQLConnectionParam.class);

        if (pgSQLConnectionParam == null) {
            throw new IllegalArgumentException("PostgreSQL connection param must not be null");
        }

        pgSQLConnectionParam.setUrl(buildUrl(pgSQLConnectionParam));
        pgSQLConnectionParam.setDbType(DbType.POSTGRE_SQL);

        if (StringUtils.isBlank(pgSQLConnectionParam.getDriver())) {
            pgSQLConnectionParam.setDriver(DEFAULT_DRIVER);
        }

        return pgSQLConnectionParam;
    }

    @Override
    public void checkDatasourceParam(BaseConnectionParam baseConnectionParam) {
        // TODO: add postgresql datasource param validation if needed
    }

    private String buildUrl(PgSQLConnectionParam pgSQLConnectionParam) {
        String base = String.format("%s%s:%s/%s",
                jdbcPrefix(),
                pgSQLConnectionParam.getHost(),
                pgSQLConnectionParam.getPort(),
                pgSQLConnectionParam.getDatabase());

        Map<String, String> other = pgSQLConnectionParam.getOtherAsMap();
        if (MapUtils.isEmpty(other)) {
            return base;
        }

        return base + "?" + buildQueryString(other);
    }

    private String jdbcPrefix() {
        return DataSourceConstants.JDBC_POSTGRESQL;
    }

    private String buildQueryString(Map<String, String> params) {
        return params.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining("&"));
    }
}
