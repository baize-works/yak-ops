package org.apache.seatunnel.plugin.datasource.oracle.param;

import com.google.auto.service.AutoService;
import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.analysis.JobDefinitionAnalyzer;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilderFactory;
import org.apache.seatunnel.plugin.datasource.api.jdbc.*;
import org.apache.seatunnel.plugin.datasource.oracle.analysis.OracleJobDefinitionAnalyzer;
import org.apache.seatunnel.plugin.datasource.oracle.connection.OracleConnectionProvider;
import org.apache.seatunnel.plugin.datasource.oracle.metadata.OracleCatalog;
import io.yak.ops.plugin.spi.datasource.BaseConnectionParam;
import io.yak.ops.plugin.spi.enums.DbType;

@AutoService(DataSourceProcessor.class)
@Slf4j
public class OracleDataSourceProcessor extends AbstractDataSourceProcessor {

    private final JdbcConnectionProvider connectionManager = new OracleConnectionProvider();
    private final JdbcParamConverter paramConverter = new OracleParamConverter();
    private final JobDefinitionAnalyzer jobDefinitionAnalyzer = new OracleJobDefinitionAnalyzer();

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
        return new OracleCatalog(connectionParam, connectionManager);
    }

    @Override
    public DbType getDbType() {
        return DbType.ORACLE;
    }

    @Override
    public boolean acceptsURL(String url) {
        return url.startsWith("jdbc:oracle:thin:");
    }

    @Override
    public DataSourceProcessor create() {
        return new OracleDataSourceProcessor();
    }

    @Override
    public JobDefinitionAnalyzer getJobDefinitionAnalyzer() {
        return jobDefinitionAnalyzer;
    }

    @Override
    public String connectivityCheckSql() {
        return "select 1 as connectivity_check from dual";
    }

}
