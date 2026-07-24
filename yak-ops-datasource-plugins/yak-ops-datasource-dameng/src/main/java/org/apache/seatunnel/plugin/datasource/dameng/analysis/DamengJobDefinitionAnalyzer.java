package org.apache.seatunnel.plugin.datasource.dameng.analysis;

import com.typesafe.config.Config;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.analysis.DatasourceAnalysisContext;
import org.apache.seatunnel.plugin.datasource.api.analysis.DatasourceAnalysisRole;
import org.apache.seatunnel.plugin.datasource.api.analysis.JobDefinitionAnalyzer;
import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.common.modal.JobDefinitionAnalysisResult;
import io.baize.flow.common.utils.JSONUtils;
import io.baize.flow.web.contract.dto.config.GuideMultiJobContent;
import io.baize.flow.plugin.spi.enums.DbType;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Slf4j
public class DamengJobDefinitionAnalyzer implements JobDefinitionAnalyzer {

    @Override
    public boolean supports(DatasourceAnalysisContext context) {
        return context != null && context.getDbType() == DbType.DAMENG;
    }

    @Override
    public JobDefinitionAnalysisResult analyze(DatasourceAnalysisContext context) {
        if (context == null) {
            return JobDefinitionAnalysisResult.builder().build();
        }

        if (context.getMode() == JobDefinitionMode.GUIDE_MULTI) {
            return buildResult(
                    context.getRole(),
                    context.getDatasourceId(),
                    JSONUtils.toJsonString(resolveMultiTables(context))
            );
        }

        String table = context.getRole() == DatasourceAnalysisRole.SOURCE
                ? resolveSourceTable(context)
                : resolveSinkTable(context);

        return buildResult(
                context.getRole(),
                context.getDatasourceId(),
                normalizeTable(table)
        );
    }

    private JobDefinitionAnalysisResult buildResult(DatasourceAnalysisRole role,
                                                    Long datasourceId,
                                                    String table) {
        if (role == DatasourceAnalysisRole.SOURCE) {
            return JobDefinitionAnalysisResult.builder()
                    .sourceType(DbType.DAMENG.name())
                    .sourceDatasourceId(datasourceId)
                    .sourceTable(StringUtils.trimToEmpty(table))
                    .build();
        }

        return JobDefinitionAnalysisResult.builder()
                .sinkType(DbType.DAMENG.name())
                .sinkDatasourceId(datasourceId)
                .sinkTable(StringUtils.trimToEmpty(table))
                .build();
    }

    private String resolveSourceTable(DatasourceAnalysisContext context) {
        return firstNonBlank(
                safeGetString(context.getPluginConfig(), "table"),
                safeGetString(context.getPluginConfig(), "table_path"),
                safeGetString(context.getPluginConfig(), "table_name"),
                safeGetString(context.getPluginConfig(), "query")
        );
    }

    private String resolveSinkTable(DatasourceAnalysisContext context) {
        return firstNonBlank(
                safeGetString(context.getPluginConfig(), "targetTableName"),
                safeGetString(context.getPluginConfig(), "table"),
                safeGetString(context.getPluginConfig(), "table_path"),
                safeGetString(context.getPluginConfig(), "query")
        );
    }

    private List<String> resolveMultiTables(DatasourceAnalysisContext context) {
        List<String> result = new ArrayList<>();

        result.addAll(safeGetStringList(context.getPluginConfig(), "table_list"));
        result.addAll(safeGetStringList(context.getPluginConfig(), "tableList"));

        Map<String, Object> node = context.getWorkflowNode();
        if (node != null && !node.isEmpty()) {
            Map<String, Object> data = safeMap(node.get("data"));
            Map<String, Object> config = safeMap(data.get("config"));

            result.addAll(getStringList(config, "table_list"));
            result.addAll(getStringList(config, "tableList"));
            result.addAll(getStringList(data, "table_list"));
            result.addAll(getStringList(data, "tableList"));
        }

        if (CollectionUtils.isEmpty(result)
                && context.getRawContent() instanceof GuideMultiJobContent) {
            GuideMultiJobContent content = (GuideMultiJobContent) context.getRawContent();
            if (content.getTableMatch() != null) {
                result.addAll(cleanTables(content.getTableMatch().getTables()));
            }
        }

        return distinct(result);
    }

    private String safeGetString(Config config, String path) {
        try {
            if (config != null && config.hasPath(path)) {
                return StringUtils.trimToEmpty(config.getString(path));
            }
        } catch (Exception e) {
            log.debug("Read dameng job definition config failed, path={}", path, e);
        }
        return "";
    }

    private List<String> safeGetStringList(Config config, String path) {
        try {
            if (config != null && config.hasPath(path)) {
                return cleanTables(config.getStringList(path));
            }
        } catch (Exception e) {
            log.debug("Read dameng job definition table list failed, path={}", path, e);
        }
        return Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> safeMap(Object value) {
        if (value instanceof Map) {
            return (Map<String, Object>) value;
        }
        return Collections.emptyMap();
    }

    @SuppressWarnings("unchecked")
    private List<String> getStringList(Map<String, Object> map, String key) {
        if (map == null || map.isEmpty() || key == null) {
            return Collections.emptyList();
        }

        Object value = map.get(key);
        if (!(value instanceof List)) {
            return Collections.emptyList();
        }

        List<String> result = new ArrayList<>();
        for (Object item : (List<Object>) value) {
            if (item != null && StringUtils.isNotBlank(String.valueOf(item))) {
                result.add(normalizeTable(String.valueOf(item)));
            }
        }
        return result;
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

    private List<String> cleanTables(List<String> tables) {
        if (CollectionUtils.isEmpty(tables)) {
            return Collections.emptyList();
        }

        List<String> result = new ArrayList<>();
        for (String table : tables) {
            if (StringUtils.isNotBlank(table)) {
                result.add(normalizeTable(table));
            }
        }
        return result;
    }

    private List<String> distinct(List<String> values) {
        if (CollectionUtils.isEmpty(values)) {
            return Collections.emptyList();
        }

        List<String> result = new ArrayList<>();
        for (String value : values) {
            if (StringUtils.isNotBlank(value) && !result.contains(value.trim())) {
                result.add(value.trim());
            }
        }
        return result;
    }

    private String normalizeTable(String raw) {
        if (raw == null) {
            return "";
        }

        String value = raw.trim();
        if ((value.startsWith("\"") && value.endsWith("\""))
                || (value.startsWith("`") && value.endsWith("`"))
                || (value.startsWith("[") && value.endsWith("]"))) {
            value = value.substring(1, value.length() - 1);
        }

        return value.trim();
    }
}
