package org.apache.seatunnel.plugin.datasource.pgsql.param;

import com.google.auto.service.AutoService;
import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.analysis.JobDefinitionAnalyzer;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilderFactory;
import org.apache.seatunnel.plugin.datasource.api.jdbc.*;
import org.apache.seatunnel.plugin.datasource.pgsql.analysis.PostgreSQLJobDefinitionAnalyzer;
import org.apache.seatunnel.plugin.datasource.pgsql.connection.PgSQLConnectionProvider;
import org.apache.seatunnel.plugin.datasource.pgsql.metadata.PgSQLCatalog;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;
import io.baize.flow.plugin.spi.enums.DbType;

@AutoService(DataSourceProcessor.class)
@Slf4j
public class PgSQLDataSourceProcessor extends AbstractDataSourceProcessor {

    private final JdbcConnectionProvider connectionManager = new PgSQLConnectionProvider();
    private final JdbcParamConverter paramConverter = new PgSQLParamConverter();
    private final JobDefinitionAnalyzer jobDefinitionAnalyzer = new PostgreSQLJobDefinitionAnalyzer();

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
        return new PgSQLCatalog(connectionParam, connectionManager);
    }

    @Override
    public DbType getDbType() {
        return DbType.POSTGRE_SQL;
    }

    @Override
    public boolean acceptsURL(String url) {
        return url.startsWith("jdbc:postgresql:");
    }

    @Override
    public DataSourceProcessor create() {
        return new PgSQLDataSourceProcessor();
    }

    @Override
    public JobDefinitionAnalyzer getJobDefinitionAnalyzer() {
        return jobDefinitionAnalyzer;
    }
}
