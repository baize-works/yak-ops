package org.apache.seatunnel.plugin.datasource.kingbase.param;

import com.google.auto.service.AutoService;
import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.analysis.JobDefinitionAnalyzer;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilderFactory;
import org.apache.seatunnel.plugin.datasource.api.jdbc.AbstractDataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcCatalog;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConnectionProvider;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcParamConverter;
import org.apache.seatunnel.plugin.datasource.kingbase.analysis.KingbaseJobDefinitionAnalyzer;
import org.apache.seatunnel.plugin.datasource.kingbase.connection.KingbaseConnectionProvider;
import org.apache.seatunnel.plugin.datasource.kingbase.metadata.KingbaseCatalog;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;
import io.baize.flow.plugin.spi.enums.DbType;

@AutoService(DataSourceProcessor.class)
@Slf4j
public class KingbaseDataSourceProcessor extends AbstractDataSourceProcessor {

    private final JdbcConnectionProvider connectionManager = new KingbaseConnectionProvider();
    private final JdbcParamConverter paramConverter = new KingbaseParamConverter();
    private final JobDefinitionAnalyzer jobDefinitionAnalyzer = new KingbaseJobDefinitionAnalyzer();

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
        return new KingbaseCatalog(connectionParam, connectionManager);
    }

    @Override
    public DbType getDbType() {
        return DbType.KINGBASE;
    }

    @Override
    public boolean acceptsURL(String url) {
        return url.startsWith("jdbc:kingbase8:");
    }

    @Override
    public DataSourceProcessor create() {
        return new KingbaseDataSourceProcessor();
    }

    @Override
    public JobDefinitionAnalyzer getJobDefinitionAnalyzer() {
        return jobDefinitionAnalyzer;
    }
}
