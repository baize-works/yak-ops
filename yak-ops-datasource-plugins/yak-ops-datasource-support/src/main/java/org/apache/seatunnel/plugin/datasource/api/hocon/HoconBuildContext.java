package org.apache.seatunnel.plugin.datasource.api.hocon;

import com.typesafe.config.Config;
import lombok.Builder;
import lombok.Getter;
import io.baize.flow.common.enums.HoconBuildStage;

@Getter
@Builder
public class HoconBuildContext {

    /**
     * Raw connection params from datasource table.
     */
    private final String connectionParam;

    /**
     * Parsed connection params.
     */
    private final Config connectionConfig;

    /**
     * Node-level config from workflow.
     */
    private final Config nodeConfig;

    /**
     * Build stage, such as preview / instance.
     */
    private final HoconBuildStage stage;

    /**
     * Schedule config, used by time variable rendering if needed.
     */
    private final Object scheduleConfig;

    /**
     * Whether current DAG contains transform nodes.
     */
    private final boolean hasTransform;

    /**
     * Optional datasource basic info.
     * Use primitive fields instead of DAO entity.
     */
    private final Long dataSourceId;

    private final String dataSourceName;

    private final String dbType;
}
