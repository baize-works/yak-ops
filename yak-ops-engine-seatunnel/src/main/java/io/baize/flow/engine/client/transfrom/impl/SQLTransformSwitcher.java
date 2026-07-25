package io.baize.flow.engine.client.transfrom.impl;

import com.google.auto.service.AutoService;
import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.engine.client.transfrom.TransformConfigSwitcher;
import io.baize.flow.engine.client.transfrom.domain.SQLTransformOptions;
import io.baize.flow.engine.client.transfrom.domain.Transform;
import io.baize.flow.engine.client.transfrom.domain.TransformOptions;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * SQL Transform configuration switcher.
 */
@Slf4j
@AutoService(TransformConfigSwitcher.class)
public class SQLTransformSwitcher implements TransformConfigSwitcher {

    @Override
    public Transform getTransform() {
        return Transform.SQL;
    }

    @Override
    public Config transform(TransformOptions options) {
        if (!(options instanceof SQLTransformOptions)) {
            throw new IllegalArgumentException(
                    "Invalid TransformOptions type for SQL: "
                            + (options == null
                            ? "null"
                            : options.getClass().getName())
            );
        }

        SQLTransformOptions sqlOptions = (SQLTransformOptions) options;

        validate(sqlOptions);

        String pluginInput = sqlOptions.getEffectivePluginInput();
        String pluginOutput = sqlOptions.getEffectivePluginOutput();
        String query = sqlOptions.getEffectiveQuery();

        Map<String, Object> sqlConfig = new LinkedHashMap<>();
        sqlConfig.put("plugin_input", pluginInput);
        sqlConfig.put("plugin_output", pluginOutput);
        sqlConfig.put("query", query);

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("Sql", sqlConfig);

        Config config = ConfigFactory.parseMap(root);

        log.info(
                "Generating SQL transform config, plugin_input={}, plugin_output={}",
                pluginInput,
                pluginOutput
        );

        log.debug(
                "Generated SQL transform config: {}",
                config.root().render()
        );

        return config;
    }

    private void validate(SQLTransformOptions options) {
        String pluginInput = options.getEffectivePluginInput();
        String pluginOutput = options.getEffectivePluginOutput();
        String query = options.getEffectiveQuery();

        if (StringUtils.isBlank(pluginInput)) {
            throw new IllegalArgumentException(
                    "SQL transform plugin_input must not be empty"
            );
        }

        if (StringUtils.isBlank(pluginOutput)) {
            throw new IllegalArgumentException(
                    "SQL transform plugin_output must not be empty"
            );
        }

        if (StringUtils.isBlank(query)) {
            throw new IllegalArgumentException(
                    "SQL transform query must not be empty"
            );
        }
    }
}