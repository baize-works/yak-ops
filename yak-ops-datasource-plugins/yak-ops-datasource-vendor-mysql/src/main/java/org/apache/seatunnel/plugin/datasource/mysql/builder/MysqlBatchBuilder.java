package org.apache.seatunnel.plugin.datasource.mysql.builder;

import com.google.auto.service.AutoService;
import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;
import org.apache.seatunnel.plugin.datasource.api.hocon.AbstractJdbcBatchBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;

@AutoService(DataSourceHoconBuilder.class)
public class MysqlBatchBuilder extends AbstractJdbcBatchBuilder {
    
    @Override
    protected String defaultDriver() {
        return DataSourceConstants.COM_MYSQL_JDBC_DRIVER;
    }
    
    @Override
    public String pluginName() {
        return "JDBC-MYSQL";
    }


}
