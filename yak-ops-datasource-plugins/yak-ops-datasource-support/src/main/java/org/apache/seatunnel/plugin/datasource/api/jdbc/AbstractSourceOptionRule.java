package org.apache.seatunnel.plugin.datasource.api.jdbc;

import io.baize.flow.common.config.OptionRule;

import static org.apache.seatunnel.plugin.datasource.api.option.JdbcOptions.*;
import static org.apache.seatunnel.plugin.datasource.api.option.JdbcSourceOptions.*;

public abstract class AbstractSourceOptionRule implements SourceOptionRule {
    @Override
    public OptionRule sourceOptionRule() {
        return OptionRule.builder()
                .required(JDBC_URL, DRIVER)
                .optional(
                        USER,
                        PASSWORD,
                        CONNECTION_CHECK_TIMEOUT_SEC,
                        FETCH_SIZE,
                        PARTITION_COLUMN,
                        PARTITION_UPPER_BOUND,
                        PARTITION_LOWER_BOUND,
                        PARTITION_NUM,
                        COMPATIBLE_MODE,
                        PROPERTIES,
                        QUERY,
                        USE_SELECT_COUNT,
                        SKIP_ANALYZE,
                        TABLE_PATH,
                        WHERE_CONDITION,
                        TABLE_LIST,
                        SPLIT_SIZE,
                        SPLIT_EVEN_DISTRIBUTION_FACTOR_UPPER_BOUND,
                        SPLIT_EVEN_DISTRIBUTION_FACTOR_LOWER_BOUND,
                        SPLIT_SAMPLE_SHARDING_THRESHOLD,
                        SPLIT_INVERSE_SAMPLING_RATE,
                        DIALECT)
                .build();
    }

}
