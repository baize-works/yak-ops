package io.baize.flow.engine.client.transfrom.domain;

import lombok.Data;
import org.apache.commons.lang3.StringUtils;

/**
 * SQL Transform node options.
 */
@Data
public class SQLTransformOptions implements TransformOptions {

    private String id;

    private String nodeType;

    private String componentType;

    private String title;

    private String label;

    private String description;


    private SQLTransformConfig config;


    private String pluginInput;

    private String pluginOutput;

    private String query;

    private String sql;

    public String getEffectivePluginInput() {
        if (config != null && StringUtils.isNotBlank(config.getPluginInput())) {
            return config.getPluginInput();
        }
        return pluginInput;
    }

    public String getEffectivePluginOutput() {
        if (config != null && StringUtils.isNotBlank(config.getPluginOutput())) {
            return config.getPluginOutput();
        }
        return pluginOutput;
    }

    public String getEffectiveQuery() {
        if (config != null) {
            String configQuery = config.getEffectiveQuery();
            if (StringUtils.isNotBlank(configQuery)) {
                return configQuery;
            }
        }

        if (StringUtils.isNotBlank(query)) {
            return query;
        }

        return sql;
    }
}