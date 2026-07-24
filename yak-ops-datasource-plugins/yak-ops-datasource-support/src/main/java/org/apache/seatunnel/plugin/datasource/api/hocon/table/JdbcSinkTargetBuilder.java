package org.apache.seatunnel.plugin.datasource.api.hocon.table;

import com.typesafe.config.Config;

import java.util.Map;

public interface JdbcSinkTargetBuilder {

    void build(Config config,
               Config conn,
               Map<String, Object> map);
}