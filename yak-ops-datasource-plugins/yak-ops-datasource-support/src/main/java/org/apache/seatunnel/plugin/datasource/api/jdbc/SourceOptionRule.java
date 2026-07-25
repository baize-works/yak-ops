package org.apache.seatunnel.plugin.datasource.api.jdbc;

import io.yak.ops.common.config.OptionRule;

public interface SourceOptionRule {

    OptionRule sourceOptionRule();

    String pluginName();
}
