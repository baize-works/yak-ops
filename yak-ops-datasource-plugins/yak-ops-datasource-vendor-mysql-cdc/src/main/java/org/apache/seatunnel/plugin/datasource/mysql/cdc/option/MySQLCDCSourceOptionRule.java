package org.apache.seatunnel.plugin.datasource.mysql.cdc.option;

import com.google.auto.service.AutoService;
import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.jdbc.SourceOptionRule;
import org.apache.seatunnel.plugin.datasource.api.option.*;
import io.baize.flow.common.config.OptionRule;

@AutoService(SourceOptionRule.class)
@Slf4j
public class MySQLCDCSourceOptionRule implements SourceOptionRule {
    @Override
    public OptionRule sourceOptionRule() {
        return CDCJdbcSourceOptions.getBaseRule()
                .required(
                        CDCJdbcSourceOptions.USERNAME,
                        CDCJdbcSourceOptions.PASSWORD,
                        JdbcCommonOptions.URL)
                .exclusive(ConnectorCommonOptions.TABLE_NAMES, ConnectorCommonOptions.TABLE_PATTERN)
                .optional(
                        CDCJdbcSourceOptions.DATABASE_NAMES,
                        CDCJdbcSourceOptions.SERVER_ID,
                        CDCJdbcSourceOptions.SERVER_TIME_ZONE,
                        CDCJdbcSourceOptions.CONNECT_TIMEOUT_MS,
                        CDCJdbcSourceOptions.CONNECT_MAX_RETRIES,
                        CDCJdbcSourceOptions.CONNECTION_POOL_SIZE,
                        CDCJdbcSourceOptions.CHUNK_KEY_EVEN_DISTRIBUTION_FACTOR_LOWER_BOUND,
                        CDCJdbcSourceOptions.CHUNK_KEY_EVEN_DISTRIBUTION_FACTOR_UPPER_BOUND,
                        CDCJdbcSourceOptions.SAMPLE_SHARDING_THRESHOLD,
                        CDCJdbcSourceOptions.INVERSE_SAMPLING_RATE,
                        CDCJdbcSourceOptions.TABLE_NAMES_CONFIG,
                        CDCJdbcSourceOptions.SCHEMA_CHANGES_ENABLED,
                        JdbcCommonOptions.INT_TYPE_NARROWING)
                .optional(MySqlSourceOptions.STARTUP_MODE, MySqlSourceOptions.STOP_MODE)
                .conditional(
                        MySqlSourceOptions.STARTUP_MODE,
                        StartupMode.INITIAL,
                        SourceOptions.EXACTLY_ONCE)
                .conditional(
                        MySqlSourceOptions.STARTUP_MODE,
                        StartupMode.SPECIFIC,
                        SourceOptions.STARTUP_SPECIFIC_OFFSET_FILE,
                        SourceOptions.STARTUP_SPECIFIC_OFFSET_POS)
                .conditional(
                        MySqlSourceOptions.STOP_MODE,
                        StopMode.SPECIFIC,
                        SourceOptions.STOP_SPECIFIC_OFFSET_FILE,
                        SourceOptions.STOP_SPECIFIC_OFFSET_POS)
                .conditional(
                        MySqlSourceOptions.STARTUP_MODE,
                        StartupMode.TIMESTAMP,
                        SourceOptions.STARTUP_TIMESTAMP)
                .build();
    }

    @Override
    public String pluginName() {
        return "MySQL-CDC";
    }
}
