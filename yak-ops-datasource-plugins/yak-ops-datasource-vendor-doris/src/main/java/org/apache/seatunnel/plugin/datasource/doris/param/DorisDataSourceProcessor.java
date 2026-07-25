package org.apache.seatunnel.plugin.datasource.doris.param;

import com.google.auto.service.AutoService;
import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.analysis.JobDefinitionAnalyzer;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilderFactory;
import org.apache.seatunnel.plugin.datasource.api.jdbc.*;
import org.apache.seatunnel.plugin.datasource.doris.analysis.DorisJobDefinitionAnalyzer;
import org.apache.seatunnel.plugin.datasource.doris.connection.DorisConnectionProvider;
import org.apache.seatunnel.plugin.datasource.doris.metadata.DorisCatalog;
import io.baize.flow.common.config.OptionRule;
import io.baize.flow.common.config.Options;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;
import io.baize.flow.plugin.spi.enums.DbType;

@AutoService(DataSourceProcessor.class)
@Slf4j
public class DorisDataSourceProcessor extends AbstractDataSourceProcessor {

    private final JdbcConnectionProvider connectionManager = new DorisConnectionProvider();
    private final JdbcParamConverter paramConverter = new DorisParamConverter();
    private final JobDefinitionAnalyzer jobDefinitionAnalyzer = new DorisJobDefinitionAnalyzer();

    @Override
    public DataSourceHoconBuilder getQueryBuilder(String pluginName) {
        return DataSourceHoconBuilderFactory.getBuilder(pluginName);
    }

    @Override
    public JdbcConnectionProvider getConnectionManager() {
        return connectionManager;
    }

    @Override
    public JdbcParamConverter getParamConverter() {
        return paramConverter;
    }

    @Override
    public JdbcCatalog getMetadataService(BaseConnectionParam connectionParam) {
        return new DorisCatalog(connectionParam, connectionManager);
    }

    @Override
    public DbType getDbType() {
        return DbType.DORIS;
    }

    @Override
    public boolean acceptsURL(String url) {
        return url.startsWith("jdbc:mysql:");
    }

    @Override
    public DataSourceProcessor create() {
        return new DorisDataSourceProcessor();
    }

    @Override
    public JobDefinitionAnalyzer getJobDefinitionAnalyzer() {
        return jobDefinitionAnalyzer;
    }

    @Override
    public OptionRule sinkOptionRule() {
        return OptionRule.builder()
                .required(
                        Options.key("fenodes").stringType().noDefaultValue().withDescription("Doris FE nodes HTTP address"),
                        Options.key("username").stringType().noDefaultValue().withDescription("username"),
                        Options.key("password").stringType().noDefaultValue().withDescription("password"),
                        Options.key("database").stringType().noDefaultValue().withDescription("database"),
                        Options.key("table").stringType().noDefaultValue().withDescription("table"),
                        Options.key("sink.label-prefix").stringType().noDefaultValue().withDescription("stream load label prefix"),
                        Options.key("doris.config").mapType().noDefaultValue().withDescription("doris stream load config")
                )
                .optional(
                        Options.key("query-port").intType().defaultValue(9030).withDescription("Doris query port"),
                        Options.key("sink.enable-2pc").booleanType().defaultValue(false).withDescription("enable 2pc"),
                        Options.key("sink.enable-delete").booleanType().noDefaultValue().withDescription("enable delete"),
                        Options.key("sink.check-interval").intType().defaultValue(10000).withDescription("check interval ms"),
                        Options.key("sink.max-retries").intType().defaultValue(3).withDescription("max retries"),
                        Options.key("sink.buffer-size").intType().defaultValue(262144).withDescription("buffer size"),
                        Options.key("sink.buffer-count").intType().defaultValue(3).withDescription("buffer count"),
                        Options.key("doris.batch.size").intType().defaultValue(1024).withDescription("batch size per request"),
                        Options.key("needs_unsupported_type_casting").booleanType().defaultValue(false).withDescription("enable type casting"),
                        Options.key("case_sensitive").booleanType().defaultValue(true).withDescription("case sensitive"),
                        Options.key("schema_save_mode").stringType().defaultValue("CREATE_SCHEMA_WHEN_NOT_EXIST").withDescription("schema save mode"),
                        Options.key("data_save_mode").stringType().defaultValue("APPEND_DATA").withDescription("data save mode"),
                        Options.key("save_mode_create_template").stringType().noDefaultValue().withDescription("create table template"),
                        Options.key("custom_sql").stringType().noDefaultValue().withDescription("custom SQL for CUSTOM_PROCESSING mode")
                )
                .build();
    }
}
