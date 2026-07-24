package org.apache.seatunnel.plugin.datasource.oracle.param;

import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcParamConverter;
import io.baize.flow.common.utils.JSONUtils;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;
import io.baize.flow.plugin.spi.enums.DbConnectType;
import io.baize.flow.plugin.spi.enums.DbType;

public class OracleParamConverter implements JdbcParamConverter {

    private static final String DEFAULT_DRIVER = "oracle.jdbc.OracleDriver";

    @Override
    public BaseConnectionParam createConnectionParams(String connectionJson) {
        OracleConnectionParam oracleConnectionParam =
                JSONUtils.parseObject(connectionJson, OracleConnectionParam.class);

        if (oracleConnectionParam == null) {
            throw new IllegalArgumentException("Oracle connection param must not be null");
        }

        oracleConnectionParam.setUrl(buildUrl(oracleConnectionParam));
        oracleConnectionParam.setDbType(DbType.ORACLE);

        if (StringUtils.isBlank(oracleConnectionParam.getDriver())) {
            oracleConnectionParam.setDriver(DEFAULT_DRIVER);
        }

        return oracleConnectionParam;
    }

    @Override
    public void checkDatasourceParam(BaseConnectionParam baseConnectionParam) {
        // TODO: add oracle datasource param validation if needed
    }

    private String buildUrl(OracleConnectionParam param) {
        boolean isSid = DbConnectType.ORACLE_SID.equals(param.getConnectType());

        String prefix = isSid
                ? DataSourceConstants.JDBC_ORACLE_SID
                : DataSourceConstants.JDBC_ORACLE_SERVICE_NAME;

        String separator = isSid ? ":" : "/";

        return String.format("%s%s:%s%s%s",
                prefix,
                param.getHost(),
                param.getPort(),
                separator,
                param.getDatabase());
    }
}