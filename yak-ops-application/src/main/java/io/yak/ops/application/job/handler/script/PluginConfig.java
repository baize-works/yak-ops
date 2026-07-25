package io.yak.ops.application.job.handler.script;

import com.typesafe.config.Config;
import lombok.ToString;

@ToString
public class PluginConfig {
    private final String pluginName;
    private final Config config;

    public PluginConfig(String pluginName, Config config) {
        this.pluginName = pluginName;
        this.config = config;
    }

    public String getPluginName() {
        return pluginName;
    }

    public Config getConfig() {
        return config;
    }
}
