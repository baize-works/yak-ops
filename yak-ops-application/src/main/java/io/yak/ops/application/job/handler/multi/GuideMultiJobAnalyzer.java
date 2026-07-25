package io.yak.ops.application.job.handler.multi;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.analysis.DatasourceAnalysisContext;
import org.apache.seatunnel.plugin.datasource.api.analysis.DatasourceAnalysisRole;
import org.apache.seatunnel.plugin.datasource.api.analysis.JobDefinitionAnalyzer;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.utils.DataSourceUtils;
import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.common.modal.JobDefinitionAnalysisResult;
import io.yak.ops.application.model.dto.config.GuideMultiJobContent;
import io.yak.ops.plugin.spi.enums.DbType;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class GuideMultiJobAnalyzer {

    public JobDefinitionAnalysisResult analyze(GuideMultiJobContent content) {
        JobDefinitionAnalysisResult sourceAnalysis = analyzeSource(content);
        JobDefinitionAnalysisResult sinkAnalysis = analyzeSink(content);

        return JobDefinitionAnalysisResult.builder()
                .sourceType(sourceAnalysis.getSourceType())
                .sinkType(sinkAnalysis.getSinkType())
                .sourceDatasourceId(sourceAnalysis.getSourceDatasourceId())
                .sinkDatasourceId(sinkAnalysis.getSinkDatasourceId())
                .sourceTable(sourceAnalysis.getSourceTable())
                .sinkTable(sinkAnalysis.getSinkTable())
                .build();
    }

    private JobDefinitionAnalysisResult analyzeSource(GuideMultiJobContent content) {
        GuideMultiJobContent.WorkflowSourceConfig source =
                content == null ? null : content.getSource();

        return analyzeNode(
                DatasourceAnalysisRole.SOURCE,
                source == null ? "" : source.getDbType(),
                resolveSourcePluginName(source),
                source == null ? null : source.getDatasourceId(),
                buildSourcePluginConfig(source, content),
                content
        );
    }

    private JobDefinitionAnalysisResult analyzeSink(GuideMultiJobContent content) {
        GuideMultiJobContent.WorkflowTargetConfig target =
                content == null ? null : content.getTarget();

        return analyzeNode(
                DatasourceAnalysisRole.SINK,
                target == null ? "" : target.getDbType(),
                resolveTargetPluginName(target),
                target == null ? null : target.getDatasourceId(),
                buildTargetPluginConfig(target, content),
                content
        );
    }

    private JobDefinitionAnalysisResult analyzeNode(DatasourceAnalysisRole role,
                                                    String dbTypeText,
                                                    String pluginName,
                                                    String datasourceId,
                                                    Config pluginConfig,
                                                    GuideMultiJobContent content) {
        if (StringUtils.isBlank(dbTypeText)) {
            return JobDefinitionAnalysisResult.builder().build();
        }

        DbType dbType;
        try {
            dbType = DbType.valueOf(dbTypeText.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return JobDefinitionAnalysisResult.builder().build();
        }

        DataSourceProcessor processor = DataSourceUtils.getDatasourceProcessor(dbType);
        if (processor == null || processor.getJobDefinitionAnalyzer() == null) {
            return JobDefinitionAnalysisResult.builder().build();
        }

        JobDefinitionAnalyzer analyzer = processor.getJobDefinitionAnalyzer();

        DatasourceAnalysisContext context = DatasourceAnalysisContext.builder()
                .mode(JobDefinitionMode.GUIDE_MULTI)
                .role(role)
                .dbType(dbType)
                .pluginName(pluginName)
                .datasourceId(parseLong(datasourceId))
                .pluginConfig(pluginConfig)
                .rawContent(content)
                .build();

        return analyzer.analyze(context);
    }

    private Config buildSourcePluginConfig(GuideMultiJobContent.WorkflowSourceConfig source,
                                           GuideMultiJobContent content) {
        if (source == null) {
            return ConfigFactory.empty();
        }

        Map<String, Object> config = new HashMap<>();
        putIfNotBlank(config, "dbType", source.getDbType());
        putIfNotBlank(config, "pluginName", source.getPluginName());
        putIfNotBlank(config, "connectorType", source.getConnectorType());
        putIfNotBlank(config, "dataSourceId", source.getDatasourceId());

        List<String> tables = resolveTableList(content);
        if (CollectionUtils.isNotEmpty(tables)) {
            config.put("table_list", tables);
        }

        return ConfigFactory.parseMap(config);
    }

    private Config buildTargetPluginConfig(GuideMultiJobContent.WorkflowTargetConfig target,
                                           GuideMultiJobContent content) {
        if (target == null) {
            return ConfigFactory.empty();
        }

        Map<String, Object> config = new HashMap<>();
        putIfNotBlank(config, "dbType", target.getDbType());
        putIfNotBlank(config, "pluginName", target.getPluginName());
        putIfNotBlank(config, "connectorType", target.getConnectorType());
        putIfNotBlank(config, "dataSourceId", target.getDatasourceId());

        /*
         * 多表 sink 端直接复用 source 端 table_list。
         */
        List<String> tables = resolveTableList(content);
        if (CollectionUtils.isNotEmpty(tables)) {
            config.put("table_list", tables);
        }

        return ConfigFactory.parseMap(config);
    }

    private List<String> resolveTableList(GuideMultiJobContent content) {
        if (content == null || content.getTableMatch() == null) {
            return java.util.java.util.Collections.emptyList();
        }

        List<String> tables = content.getTableMatch().getTables();
        if (CollectionUtils.isEmpty(tables)) {
            return java.util.java.util.Collections.emptyList();
        }

        return tables;
    }

    private void putIfNotBlank(Map<String, Object> config, String key, String value) {
        if (StringUtils.isNotBlank(value)) {
            config.put(key, value);
        }
    }

    private String resolveSourcePluginName(GuideMultiJobContent.WorkflowSourceConfig source) {
        if (source == null) {
            return "";
        }

        return firstNonBlank(
                source.getPluginName(),
                source.getConnectorType()
        );
    }

    private String resolveTargetPluginName(GuideMultiJobContent.WorkflowTargetConfig target) {
        if (target == null) {
            return "";
        }

        return firstNonBlank(
                target.getPluginName(),
                target.getConnectorType()
        );
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return "";
        }

        for (String value : values) {
            if (StringUtils.isNotBlank(value)) {
                return value.trim();
            }
        }

        return "";
    }

    private Long parseLong(String value) {
        if (StringUtils.isBlank(value)) {
            return null;
        }

        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}
