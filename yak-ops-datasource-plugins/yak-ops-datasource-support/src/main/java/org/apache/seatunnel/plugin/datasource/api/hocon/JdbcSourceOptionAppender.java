package org.apache.seatunnel.plugin.datasource.api.hocon;

import com.typesafe.config.Config;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConfigReaders;

import java.util.Map;

public class JdbcSourceOptionAppender {

    public void append(Config config, Map<String, Object> map) {
        appendAdvancedOptions(config, map);
    }

    private void appendAdvancedOptions(Config config, Map<String, Object> map) {
        Integer fetchSize = JdbcConfigReaders.getInteger(config, "fetchSize", null);
        if (fetchSize != null && fetchSize > 0) {
            map.put("fetch_size", fetchSize);
        }

        Integer splitSize = JdbcConfigReaders.getInteger(config, "splitSize", null);
        if (splitSize != null && splitSize > 0) {
            map.put("split.size", splitSize);
        }
    }
}