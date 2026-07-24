package org.apache.seatunnel.plugin.datasource.api.jdbc;

import org.apache.seatunnel.plugin.datasource.api.analysis.JobDefinitionAnalyzer;
import io.baize.flow.common.config.OptionRule;
import org.apache.seatunnel.plugin.datasource.api.form.ReflectionFormGenerator;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;
import io.baize.flow.plugin.spi.enums.DbType;
import io.baize.flow.plugin.spi.form.FormFieldConfig;

import java.util.List;

/**
 * Data-source-level plugin entry.
 * Implementations provide all JDBC-related helpers for a specific RDBMS.
 */
public interface DataSourceProcessor {

    /**
     * SQL builder for this database.
     */
    DataSourceHoconBuilder getQueryBuilder(String pluginName);

    /**
     * Connection factory for this database.
     */
    JdbcConnectionProvider getConnectionManager();

    /**
     * JSON-to-param converter for this database.
     */
    JdbcParamConverter getParamConverter();

    /**
     * Metadata reader for this database.
     */
    JdbcCatalog getMetadataService(BaseConnectionParam connectionParam);

    /**
     * Validated option set for source (read) side.
     */
    OptionRule sourceOptionRule(String pluginName);

    /**
     * Validated option set for sink (write) side.
     */
    OptionRule sinkOptionRule();

    /**
     * Database type identifier.
     */
    DbType getDbType();

    /**
     * Create a new processor instance.
     * Allows each thread to obtain an isolated copy.
     */
    DataSourceProcessor create();

    /**
     * Job definition analyzer for this datasource processor.
     *
     * Used to extract datasource id, datasource type and table information
     * from source/sink job definition.
     */
    JobDefinitionAnalyzer getJobDefinitionAnalyzer();

    default List<FormFieldConfig> generateFormFields() {

        BaseConnectionParam param =
                getParamConverter().createConnectionParams("{}");

        return ReflectionFormGenerator.generate(param.getClass());
    }

    /**
     * Whether this processor supports the given JDBC url.
     */
    default boolean acceptsURL(String url) {
        return false;
    }

    /**
     * SQL used by SeaTunnel connectivity test job.
     *
     * <p>
     * Different databases may require different syntax.
     * For example, Oracle requires "from dual".
     * </p>
     */
    default String connectivityCheckSql() {
        return "select 1 as connectivity_check";
    }
}