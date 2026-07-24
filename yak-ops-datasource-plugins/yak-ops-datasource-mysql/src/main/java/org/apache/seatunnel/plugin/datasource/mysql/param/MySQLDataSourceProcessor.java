package org.apache.seatunnel.plugin.datasource.mysql.param;

import com.google.auto.service.AutoService;
import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.analysis.JobDefinitionAnalyzer;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilderFactory;
import org.apache.seatunnel.plugin.datasource.api.jdbc.*;
import org.apache.seatunnel.plugin.datasource.mysql.analysis.MySQLJobDefinitionAnalyzer;
import org.apache.seatunnel.plugin.datasource.mysql.connection.MySQLConnectionProvider;
import org.apache.seatunnel.plugin.datasource.mysql.metadata.MySQLCatalog;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;
import io.baize.flow.plugin.spi.enums.DbType;

@AutoService(DataSourceProcessor.class)
@Slf4j
public class MySQLDataSourceProcessor extends AbstractDataSourceProcessor {

    private final JdbcConnectionProvider connectionManager = new MySQLConnectionProvider();
    private final JdbcParamConverter paramConverter = new MySQLParamConverter();
    private final JobDefinitionAnalyzer jobDefinitionAnalyzer = new MySQLJobDefinitionAnalyzer();
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
        return new MySQLCatalog(connectionParam, connectionManager);
    }

    @Override
    public DbType getDbType() {
        return DbType.MYSQL;
    }

    @Override
    public JobDefinitionAnalyzer getJobDefinitionAnalyzer() {
        return jobDefinitionAnalyzer;
    }

    @Override
    public boolean acceptsURL(String url) {
        return url.startsWith("jdbc:mysql:");
    }

    @Override
    public DataSourceProcessor create() {
        return new MySQLDataSourceProcessor();
    }

}
