package org.apache.seatunnel.plugin.datasource.api.plugin;

import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import io.baize.flow.plugin.spi.enums.DbType;

import java.util.Map;

/**
 * Provider for DataSourceProcessor instances.
 *
 * <p>
 * This class acts as a static access point for all registered DataSourceProcessor plugins.
 * It wraps around DataSourceProcessorManager and provides convenience methods to retrieve
 * processors by database type.
 * </p>
 */
@Slf4j
public class DataSourceProcessorProvider {

    /**
     * Singleton manager that handles discovery and registration of DataSourceProcessor plugins.
     */
    private static final DataSourceProcessorManager dataSourcePluginManager = new DataSourceProcessorManager();

    /**
     * Static block to automatically discover and install all DataSourceProcessor plugins
     * when the class is first loaded.
     */
    static {
        dataSourcePluginManager.installProcessor();
    }

    /**
     * Private constructor to prevent instantiation.
     */
    private DataSourceProcessorProvider() {
    }

    /**
     * Explicit initialization method.
     * Can be called to trigger class loading and plugin registration.
     */
    public static void initialize() {
        log.info("Initialize DataSourceProcessorProvider");
    }

    /**
     * Get a registered DataSourceProcessor by database type.
     *
     * @param dbType the database type (non-null)
     * @return the corresponding DataSourceProcessor, or null if not found
     */
    public static DataSourceProcessor getDataSourceProcessor(@NonNull DbType dbType) {
        return dataSourcePluginManager.getDataSourceProcessorMap().get(dbType.name());
    }

    /**
     * Get an unmodifiable map of all registered DataSourceProcessor instances.
     *
     * @return map of database type name -> DataSourceProcessor
     */
    public static Map<String, DataSourceProcessor> getDataSourceProcessorMap() {
        return dataSourcePluginManager.getDataSourceProcessorMap();
    }
}
