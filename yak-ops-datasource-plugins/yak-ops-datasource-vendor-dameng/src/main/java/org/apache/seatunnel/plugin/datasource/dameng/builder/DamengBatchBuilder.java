package org.apache.seatunnel.plugin.datasource.dameng.builder;

import com.google.auto.service.AutoService;
import com.typesafe.config.Config;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;
import org.apache.seatunnel.plugin.datasource.api.hocon.AbstractJdbcBatchBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.HoconBuildContext;

@AutoService(DataSourceHoconBuilder.class)
public class DamengBatchBuilder extends AbstractJdbcBatchBuilder {

    private static final String POSTGRES_DIALECT = "Postgres";

    @Override
    protected String defaultDriver() {
        return DataSourceConstants.COM_DAMENG_JDBC_DRIVER;
    }

    @Override
    public Config buildSinkHocon(HoconBuildContext context) {
        Config config = super.buildSinkHocon(context);
        if (config.hasPath("dialect")) {
            return config;
        }

        return config.withValue(
                "dialect",
                com.typesafe.config.ConfigValueFactory.fromAnyRef(POSTGRES_DIALECT));
    }

    @Override
    protected String buildTablePath(String database, String schemaName, String table) {
        String schema = StringUtils.isNotBlank(schemaName) ? schemaName : "SYSDBA";
        return String.format("%s.%s.%s", database, schema, table);
    }

    @Override
    public String pluginName() {
        return "JDBC-DAMENG";
    }
}
