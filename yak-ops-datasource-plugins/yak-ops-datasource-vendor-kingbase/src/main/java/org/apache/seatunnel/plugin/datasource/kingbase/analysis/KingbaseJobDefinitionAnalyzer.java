package org.apache.seatunnel.plugin.datasource.kingbase.analysis;

import com.typesafe.config.Config;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.analysis.DatasourceAnalysisContext;
import org.apache.seatunnel.plugin.datasource.api.analysis.DatasourceAnalysisRole;
import org.apache.seatunnel.plugin.datasource.api.analysis.JobDefinitionAnalyzer;
import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.common.modal.JobDefinitionAnalysisResult;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.plugin.spi.enums.DbType;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Slf4j
public class KingbaseJobDefinitionAnalyzer implements JobDefinitionAnalyzer {

    @Override
    public boolean supports(DatasourceAnalysisContext context) {
        return context != null && context.getDbType() == DbType.KINGBASE;
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
                    .sourceType(DbType.KINGBASE.name())
                    .sourceDatasourceId(datasourceId)
                    .sourceTable(StringUtils.trimToEmpty(table))
                    .build();
        }

        return JobDefinitionAnalysisResult.builder()
                .sinkType(DbType.KINGBASE.name())
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

        return distinct(result);
    }

    private String safeGetString(Config config, String path) {
        try {
            if (config != null && config.hasPath(path)) {
                return StringUtils.trimToEmpty(config.getString(path));
            }
        } catch (Exception e) {
            log.debug("Read kingbase job definition config failed, path={}", path, e);
        }
        return "";
    }

    private List<String> safeGetStringList(Config config, String path) {
        try {
            if (config != null && config.hasPath(path)) {
                return cleanTables(config.getStringList(path));
            }
        } catch (Exception e) {
            log.debug("Read kingbase job definition table list failed, path={}", path, e);
        }
        return java.util.Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> safeMap(Object value) {
        if (value instanceof Map) {
            return (Map<String, Object>) value;
        }
        return java.util.Collections.emptyMap();
    }

    @SuppressWarnings("unchecked")
    private List<String> getStringList(Map<String, Object> map, String key) {
        if (map == null || map.isEmpty() || key == null) {
            return java.util.Collections.emptyList();
        }

        Object value = map.get(key);
        if (!(value instanceof List)) {
            return java.util.Collections.emptyList();
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
            return java.util.Collections.emptyList();
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
            return java.util.Collections.emptyList();
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
