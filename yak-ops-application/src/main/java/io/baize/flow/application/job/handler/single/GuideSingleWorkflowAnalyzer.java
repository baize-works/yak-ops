package io.baize.flow.application.job.handler.single;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.analysis.DatasourceAnalysisContext;
import org.apache.seatunnel.plugin.datasource.api.analysis.DatasourceAnalysisRole;
import org.apache.seatunnel.plugin.datasource.api.analysis.JobDefinitionAnalyzer;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.utils.DataSourceUtils;
import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.common.modal.JobDefinitionAnalysisResult;
import io.baize.flow.plugin.spi.enums.DbType;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class GuideSingleWorkflowAnalyzer {

    public JobDefinitionAnalysisResult analyze(Object workflowObj) {
        Map<String, Object> workflow = WorkflowNodeHelper.safeMap(workflowObj);

        Map<String, Object> sourceNode = WorkflowNodeHelper.findFirstNodeByType(workflow, "source");
        Map<String, Object> sinkNode = WorkflowNodeHelper.findFirstNodeByType(workflow, "sink");

        JobDefinitionAnalysisResult sourceAnalysis = analyzeNode(
                DatasourceAnalysisRole.SOURCE,
                sourceNode,
                workflowObj
        );

        JobDefinitionAnalysisResult sinkAnalysis = analyzeNode(
                DatasourceAnalysisRole.SINK,
                sinkNode,
                workflowObj
        );

        return JobDefinitionAnalysisResult.builder()
                .sourceType(sourceAnalysis.getSourceType())
                .sinkType(sinkAnalysis.getSinkType())
                .sourceDatasourceId(sourceAnalysis.getSourceDatasourceId())
                .sinkDatasourceId(sinkAnalysis.getSinkDatasourceId())
                .sourceTable(sourceAnalysis.getSourceTable())
                .sinkTable(sinkAnalysis.getSinkTable())
                .build();
    }

    private JobDefinitionAnalysisResult analyzeNode(DatasourceAnalysisRole role,
                                                    Map<String, Object> node,
                                                    Object workflowObj) {
        Map<String, Object> data = WorkflowNodeHelper.safeMap(node == null ? null : node.get("data"));
        Map<String, Object> config = WorkflowNodeHelper.safeMap(data.get("config"));

        String dbTypeText = firstNonBlank(
                getString(data, "dbType"),
                getString(config, "dbType")
        );

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

        Config pluginConfig = ConfigFactory.parseMap(config);

        DatasourceAnalysisContext context = DatasourceAnalysisContext.builder()
                .mode(JobDefinitionMode.GUIDE_SINGLE)
                .role(role)
                .dbType(dbType)
                .pluginName(firstNonBlank(
                        getString(data, "pluginName"),
                        getString(config, "pluginName"),
                        getString(data, "connectorType"),
                        getString(config, "connectorType")
                ))
                .datasourceId(parseLong(firstNonBlank(
                        getString(config, "dataSourceId"),
                        getString(config, "datasourceId"),
                        getString(data, "dataSourceId"),
                        getString(data, "datasourceId")
                )))
                .pluginConfig(pluginConfig)
                .workflowNode(node)
                .rawContent(workflowObj)
                .build();

        return analyzer.analyze(context);
    }

    private String getString(Map<String, Object> map, String key) {
        if (map == null || map.isEmpty() || key == null) {
            return "";
        }

        Object value = map.get(key);
        return value == null ? "" : StringUtils.trimToEmpty(String.valueOf(value));
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