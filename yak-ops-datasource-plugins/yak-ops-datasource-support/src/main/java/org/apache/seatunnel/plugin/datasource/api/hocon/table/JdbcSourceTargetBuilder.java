package org.apache.seatunnel.plugin.datasource.api.hocon.table;

import com.typesafe.config.Config;
import io.baize.flow.common.enums.HoconBuildStage;

import java.util.Map;

public interface JdbcSourceTargetBuilder {

    void build(Config config,
               Config conn,
               Map<String, Object> map,
               HoconBuildStage stage);
}