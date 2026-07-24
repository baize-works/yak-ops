package io.baize.flow.web.contract.dto.config;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class GuideMultiJobContent {

    /**
     * 对齐前端 content.source
     */
    private WorkflowSourceConfig source;

    /**
     * 对齐前端 content.target
     */
    private WorkflowTargetConfig target;

    /**
     * 对齐前端 content.tableMatch
     */
    private TableMatchConfig tableMatch;

    @Data
    public static class WorkflowSourceConfig {
        private String dbType;
        private String connectorType;
        private String datasourceId;
        private String pluginName;
        private Integer fetchSize;
        private Integer splitSize;
        private String serverIdMode;
        @JsonProperty("server-id")
        private String serverId;
    }

    @Data
    public static class WorkflowTargetConfig {
        private String dbType;
        private String connectorType;
        private String datasourceId;
        private String pluginName;
        private String dataSaveMode;
        private Integer batchSize;
        private String schemaSaveMode;
        private Boolean enableUpsert;
        private String fieldIde;
    }

    @Data
    public static class TableMatchConfig {
        /**
         * 前端当前是 "1" / "2" / "3" / "4"
         */
        private String mode;

        /**
         * matchMode 为 1/4 时使用
         */
        private List<String> tables;

        /**
         * matchMode 为 2/3 时使用
         */
        private String keyword;
    }
}