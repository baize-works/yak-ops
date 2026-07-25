package org.apache.seatunnel.plugin.datasource.dameng.param;

import org.apache.commons.collections4.MapUtils;
import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcParamConverter;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.plugin.spi.datasource.BaseConnectionParam;
import io.yak.ops.plugin.spi.enums.DbType;

import java.util.Map;
import java.util.stream.Collectors;

public class DamengParamConverter implements JdbcParamConverter {

    @Override
    public BaseConnectionParam createConnectionParams(String connectionJson) {
        DamengConnectionParam connectionParam =
                JSONUtils.parseObject(connectionJson, DamengConnectionParam.class);
        assert connectionParam != null;
        connectionParam.setDbType(DbType.DAMENG);
        connectionParam.setUrl(buildUrl(connectionParam));
        return connectionParam;
    }

    @Override
    public void checkDatasourceParam(BaseConnectionParam baseConnectionParam) {

    }

    private String buildUrl(DamengConnectionParam connectionParam) {
        String base = String.format("%s%s:%s/%s",
                jdbcPrefix(),
                connectionParam.getHost(),
                connectionParam.getPort(),
                connectionParam.getDatabase());

        Map<String, String> other = connectionParam.getOtherAsMap();
        if (MapUtils.isEmpty(other)) {
            return base;
        }
        return base + "?" + buildQueryString(other);
    }

    private String jdbcPrefix() {
        return DataSourceConstants.JDBC_DAMENG;
    }

    private String buildQueryString(Map<String, String> params) {
        return params.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining("&"));
    }
}
