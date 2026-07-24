package org.apache.seatunnel.plugin.datasource.api.hocon;

import com.typesafe.config.Config;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConfigReaders;

import java.util.List;
import java.util.Map;

import static org.apache.seatunnel.plugin.datasource.api.hocon.JdbcBatchConstants.*;

public class JdbcExtraOptionAppender {

    public void append(Config config, Map<String, Object> map) {
        appendPluginRelation(config, map);

        JdbcConfigReaders.appendConfigObject(config, CONFIG, map);
        JdbcConfigReaders.parseParamsArray(config, map);
        appendExtraParams(config, map);
    }

    /**
     * Only append SeaTunnel official plugin relation keys.
     *
     * <p>
     * Do not convert pluginInput/pluginOutput here,
     * because this class does not know whether the DAG contains transform nodes.
     * </p>
     */
    private void appendPluginRelation(Config config, Map<String, Object> map) {
        appendStringOption(config, map, PLUGIN_INPUT_UNDERSCORE, PLUGIN_INPUT_UNDERSCORE);
        appendStringOption(config, map, PLUGIN_OUTPUT_UNDERSCORE, PLUGIN_OUTPUT_UNDERSCORE);
    }

    private void appendStringOption(Config config,
                                    Map<String, Object> map,
                                    String sourceKey,
                                    String targetKey) {
        if (config == null || !config.hasPath(sourceKey)) {
            return;
        }

        String value = JdbcConfigReaders.getString(config, sourceKey, "");
        if (StringUtils.isNotBlank(value)) {
            map.put(targetKey, value.trim());
        }
    }

    private void appendExtraParams(Config config, Map<String, Object> map) {
        if (config == null || !config.hasPath(EXTRA_PARAMS)) {
            return;
        }

        List<? extends Config> list = config.getConfigList(EXTRA_PARAMS);
        for (Config item : list) {
            String key = JdbcConfigReaders.getString(item, KEY, "");
            if (StringUtils.isBlank(key)) {
                continue;
            }

            Object value = item.hasPath(VALUE) ? item.getValue(VALUE).unwrapped() : "";
            map.put(key.trim(), value);
        }
    }
}