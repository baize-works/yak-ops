package org.apache.seatunnel.plugin.datasource.api.jdbc;


import java.util.HashMap;
import java.util.Map;
import java.util.ServiceLoader;

public class SourceOptionRuleFactory {

    private static final Map<String, SourceOptionRule> BUILDER_MAP = new HashMap<>();

    static {
        ServiceLoader<SourceOptionRule> loader = ServiceLoader.load(SourceOptionRule.class);
        for (SourceOptionRule builder : loader) {
            BUILDER_MAP.put(builder.pluginName(), builder);
        }
    }

    public static SourceOptionRule getSourceOptionRule(String pluginName) {
        SourceOptionRule builder = BUILDER_MAP.get(pluginName);
        if (builder == null) {
            throw new IllegalArgumentException("No builder found for plugin: " + pluginName);
        }
        return builder;
    }
}
