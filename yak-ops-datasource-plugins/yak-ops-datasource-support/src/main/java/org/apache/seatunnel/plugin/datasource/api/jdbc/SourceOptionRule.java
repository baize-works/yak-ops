package org.apache.seatunnel.plugin.datasource.api.jdbc;

import io.baize.flow.common.config.OptionRule;

public interface SourceOptionRule {

    OptionRule sourceOptionRule();

    String pluginName();
}
