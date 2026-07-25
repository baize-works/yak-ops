package io.yak.ops.common.modal;

import com.typesafe.config.Config;
import io.yak.ops.common.enums.HoconBuildStage;

public class JdbcQueryRenderContext {

    private final Config config;
    private final Config conn;
    private final HoconBuildStage stage;
    private final String pluginName;

    public JdbcQueryRenderContext(
            Config config,
            Config conn,
            HoconBuildStage stage,
            String pluginName) {
        this.config = config;
        this.conn = conn;
        this.stage = stage;
        this.pluginName = pluginName;
    }

    public Config getConfig() {
        return config;
    }

    public Config getConn() {
        return conn;
    }

    public HoconBuildStage getStage() {
        return stage;
    }

    public String getPluginName() {
        return pluginName;
    }
}
