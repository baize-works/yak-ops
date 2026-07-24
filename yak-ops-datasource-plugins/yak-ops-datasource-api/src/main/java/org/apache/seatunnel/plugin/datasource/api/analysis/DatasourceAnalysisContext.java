package org.apache.seatunnel.plugin.datasource.api.analysis;

import com.typesafe.config.Config;
import lombok.Builder;
import lombok.Data;
import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.plugin.spi.enums.DbType;

import java.util.Map;

@Data
@Builder
public class DatasourceAnalysisContext {

    private JobDefinitionMode mode;

    private DatasourceAnalysisRole role;

    private String pluginName;

    private DbType dbType;

    private Long datasourceId;

    private Config pluginConfig;

    private Map<String, Object> workflowNode;

    private Object rawContent;
}
