package org.apache.seatunnel.plugin.datasource.mysql.param;

import org.apache.commons.collections4.MapUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcParamConverter;
import io.baize.flow.common.utils.JSONUtils;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;
import io.baize.flow.plugin.spi.enums.DbType;

import java.util.Map;
import java.util.stream.Collectors;

public class MySQLParamConverter implements JdbcParamConverter {

    @Override
    public BaseConnectionParam createConnectionParams(String connectionJson) {
        MySQLConnectionParam mySQLConnectionParam =
                JSONUtils.parseObject(connectionJson, MySQLConnectionParam.class);

        if (mySQLConnectionParam == null) {
            throw new IllegalArgumentException("MySQL connection param must not be null");
        }

        mySQLConnectionParam.setUrl(buildUrl(mySQLConnectionParam));
        mySQLConnectionParam.setDbType(DbType.MYSQL);

        if (StringUtils.isBlank(mySQLConnectionParam.getDriver())) {
            String driver = MySqlDriverResolver.resolveDriver(mySQLConnectionParam);
            mySQLConnectionParam.setDriver(driver);
        }

        return mySQLConnectionParam;
    }

    @Override
    public void checkDatasourceParam(BaseConnectionParam baseConnectionParam) {
        // TODO: add mysql datasource param validation if needed
    }

    private String buildUrl(MySQLConnectionParam mySQLConnectionParam) {
        String base = String.format("%s%s:%s/%s",
                jdbcPrefix(),
                mySQLConnectionParam.getHost(),
                mySQLConnectionParam.getPort(),
                mySQLConnectionParam.getDatabase());

        Map<String, String> other = mySQLConnectionParam.getOtherAsMap();
        if (MapUtils.isEmpty(other)) {
            return base;
        }

        return base + "?" + buildQueryString(other);
    }

    private String jdbcPrefix() {
        return DataSourceConstants.JDBC_MYSQL;
    }

    private String buildQueryString(Map<String, String> params) {
        return params.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining("&"));
    }
}