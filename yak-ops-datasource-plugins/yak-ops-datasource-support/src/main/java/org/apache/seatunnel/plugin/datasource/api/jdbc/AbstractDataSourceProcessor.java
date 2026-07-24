
package org.apache.seatunnel.plugin.datasource.api.jdbc;

import lombok.extern.slf4j.Slf4j;
import io.baize.flow.common.config.OptionRule;
import org.apache.seatunnel.plugin.datasource.api.option.DataSaveMode;

import static org.apache.seatunnel.plugin.datasource.api.option.JdbcOptions.*;
import static org.apache.seatunnel.plugin.datasource.api.option.JdbcSourceOptions.MULTI_TABLE_SINK_REPLICA;

@Slf4j
public abstract class AbstractDataSourceProcessor implements DataSourceProcessor {
    @Override
    public OptionRule sourceOptionRule(String pluginName) {
        return SourceOptionRuleFactory.getSourceOptionRule(pluginName).sourceOptionRule();
    }

    @Override
    public OptionRule sinkOptionRule() {
        return OptionRule.builder()
                .required(JDBC_URL, DRIVER, SCHEMA_SAVE_MODE, DATA_SAVE_MODE)
                .optional(
                        CREATE_INDEX,
                        USER,
                        PASSWORD,
                        CONNECTION_CHECK_TIMEOUT_SEC,
                        BATCH_SIZE,
                        IS_EXACTLY_ONCE,
                        GENERATE_SINK_SQL,
                        AUTO_COMMIT,
                        SUPPORT_UPSERT_BY_QUERY_PRIMARY_KEY_EXIST,
                        PRIMARY_KEYS,
                        COMPATIBLE_MODE,
                        MULTI_TABLE_SINK_REPLICA,
                        DIALECT)
                .conditional(
                        IS_EXACTLY_ONCE,
                        true,
                        XA_DATA_SOURCE_CLASS_NAME,
                        MAX_COMMIT_ATTEMPTS,
                        TRANSACTION_TIMEOUT_SEC)
                .conditional(IS_EXACTLY_ONCE, false, MAX_RETRIES)
                .conditional(GENERATE_SINK_SQL, true, DATABASE)
                .conditional(GENERATE_SINK_SQL, false, QUERY)
                .conditional(DATA_SAVE_MODE, DataSaveMode.CUSTOM_PROCESSING, CUSTOM_SQL)
                .build();
    }

}
