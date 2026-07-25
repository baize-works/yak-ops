package org.apache.seatunnel.plugin.datasource.oracle.builder;

import com.google.auto.service.AutoService;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.hocon.AbstractJdbcBatchBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;

@AutoService(DataSourceHoconBuilder.class)
public class OracleBatchBuilder extends AbstractJdbcBatchBuilder {
    @Override
    public String pluginName() {
        return "JDBC-ORACLE";
    }

    @Override
    public String renderTimeLiteral(String value, String timeFormat) {
        if (value == null) {
            return "NULL";
        }

        String oracleFormat = toOracleDateFormat(timeFormat);
        String escapedValue = value.replace("'", "''");

        if (StringUtils.containsIgnoreCase(timeFormat, "SSS")) {
            return "TO_TIMESTAMP('" + escapedValue + "', '" + oracleFormat + "')";
        }

        return "TO_DATE('" + escapedValue + "', '" + oracleFormat + "')";
    }

    private String toOracleDateFormat(String javaFormat) {
        if (StringUtils.isBlank(javaFormat)) {
            return "YYYY-MM-DD HH24:MI:SS";
        }

        return javaFormat
                .replace("yyyy", "YYYY")
                .replace("dd", "DD")
                .replace("HH", "HH24")
                .replace("mm", "MI")
                .replace("ss", "SS")
                .replace("SSS", "FF3");
    }

    @Override
    protected String defaultDriver() {
        return null;
    }
}
