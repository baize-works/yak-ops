package org.apache.seatunnel.plugin.datasource.oracle.option;

import com.google.auto.service.AutoService;
import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.jdbc.AbstractSourceOptionRule;
import org.apache.seatunnel.plugin.datasource.api.jdbc.SourceOptionRule;

@AutoService(SourceOptionRule.class)
@Slf4j
public class OracleSourceOptionRule extends AbstractSourceOptionRule {

    @Override
    public String pluginName() {
        return "JDBC-ORACLE";
    }
}
