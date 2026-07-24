package org.apache.seatunnel.plugin.datasource.api.plugin;

import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;

import java.util.Collections;
import java.util.Map;
import java.util.ServiceLoader;
import java.util.concurrent.ConcurrentHashMap;

import static java.lang.String.format;

/**
 * Manager for DataSourceProcessor plugins.
 *
 * <p>
 * This class discovers, registers, and manages JDBC datasource processors using Java's ServiceLoader.
 * It ensures there are no duplicate plugins for the same database type and provides access
 * to all registered processors.
 * </p>
 */
@Slf4j
public class DataSourceProcessorManager {

    /**
     * A thread-safe map storing the registered DataSourceProcessor instances, keyed by database type name.
     */
    private static final Map<String, DataSourceProcessor> dataSourceProcessorMap = new ConcurrentHashMap<>();

    /**
     * Returns an unmodifiable view of all registered DataSourceProcessor instances.
     *
     * @return map of database type name -> DataSourceProcessor
     */
    public Map<String, DataSourceProcessor> getDataSourceProcessorMap() {
        return Collections.unmodifiableMap(dataSourceProcessorMap);
    }

    /**
     * Discover and install all DataSourceProcessor implementations available via ServiceLoader.
     *
     * <p>
     * This method automatically loads each processor, prevents duplicates, and registers them
     * in the internal map.
     * </p>
     */
    public void installProcessor() {
        ServiceLoader.load(DataSourceProcessor.class).forEach(factory -> {
            final String name = factory.getDbType().name();

            if (dataSourceProcessorMap.containsKey(name)) {
                throw new IllegalStateException(
                        format("Duplicate datasource plugins named '%s'", name));
            }

            loadDatasourceClient(factory);
            log.info("Successfully registered datasource plugin -> {}", name);
        });
    }

    /**
     * Load a DataSourceProcessor instance and store it in the registry.
     *
     * @param processor the processor factory to create an instance
     */
    private void loadDatasourceClient(DataSourceProcessor processor) {
        DataSourceProcessor instance = processor.create();
        dataSourceProcessorMap.put(processor.getDbType().name(), instance);
    }
}
