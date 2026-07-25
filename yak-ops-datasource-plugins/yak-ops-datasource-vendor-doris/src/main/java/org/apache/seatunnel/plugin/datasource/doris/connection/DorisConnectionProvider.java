package org.apache.seatunnel.plugin.datasource.doris.connection;

import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;
import org.apache.seatunnel.plugin.datasource.api.jdbc.AbstractJdbcConnectionProvider;
import org.apache.seatunnel.plugin.datasource.doris.param.DorisConnectionParam;

/**
 * Doris 连接提供者。
 *
 * <p>连通性测试通过 JDBC 连接（MySQL 协议端口 9030）完成。</p>
 */
@Slf4j
public class DorisConnectionProvider
        extends AbstractJdbcConnectionProvider<DorisConnectionParam> {

    @Override
    protected String defaultDriverClass() {
        return DataSourceConstants.COM_MYSQL_CJ_JDBC_DRIVER;
    }

    @Override
    protected String resolveDriverLocation(DorisConnectionParam t) {
        return defaultBaseUrl() + t.getDriverLocation();
    }
}
