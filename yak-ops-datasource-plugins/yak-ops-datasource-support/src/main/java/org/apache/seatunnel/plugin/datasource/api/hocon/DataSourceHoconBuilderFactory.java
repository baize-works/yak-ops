package org.apache.seatunnel.plugin.datasource.api.hocon;

import java.util.HashMap;
import java.util.Map;
import java.util.ServiceLoader;

public class DataSourceHoconBuilderFactory {

    private static final Map<String, DataSourceHoconBuilder> BUILDER_MAP = new HashMap<>();

    static {
        ServiceLoader<DataSourceHoconBuilder> loader = ServiceLoader.load(DataSourceHoconBuilder.class);
        for (DataSourceHoconBuilder builder : loader) {
            BUILDER_MAP.put(builder.pluginName(), builder);
        }
    }

    public static DataSourceHoconBuilder getBuilder(String pluginName) {
        DataSourceHoconBuilder builder = BUILDER_MAP.get(pluginName);
        if (builder == null) {
            throw new IllegalArgumentException("No builder found for plugin: " + pluginName);
        }
        return builder;
    }
}
