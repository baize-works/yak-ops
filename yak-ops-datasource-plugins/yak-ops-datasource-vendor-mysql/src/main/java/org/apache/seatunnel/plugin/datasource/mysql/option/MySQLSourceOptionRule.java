package org.apache.seatunnel.plugin.datasource.mysql.option;

import com.google.auto.service.AutoService;
import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.jdbc.AbstractSourceOptionRule;
import org.apache.seatunnel.plugin.datasource.api.jdbc.SourceOptionRule;

@AutoService(SourceOptionRule.class)
@Slf4j
public class MySQLSourceOptionRule extends AbstractSourceOptionRule {

    @Override
    public String pluginName() {
        return "JDBC-MYSQL";
    }
}
