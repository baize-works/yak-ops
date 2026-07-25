package org.apache.seatunnel.plugin.datasource.mysql.cdc.builder;

import com.google.auto.service.AutoService;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.cdc.AbstractCdcSourceBuilder;

@AutoService(DataSourceHoconBuilder.class)
public class MysqlCdcSourceBuilder extends AbstractCdcSourceBuilder {

    @Override
    public String pluginName() {
        return "MySQL-CDC";
    }

    @Override
    public String sourceTemplate() {
        return ""
                + "  MySQL-CDC {\n"
                + "    datasourceId = @\n"
                + "    database-names = [\"demo\"]\n"
                + "    table-names = [\"demo.user\"]\n"
                + "    server-id = \"5400-5408\"\n"
                + "    server-time-zone = \"Asia/Shanghai\"\n"
                + "    startup.mode = \"initial\"\n"
                + "  }\n";
    }
}