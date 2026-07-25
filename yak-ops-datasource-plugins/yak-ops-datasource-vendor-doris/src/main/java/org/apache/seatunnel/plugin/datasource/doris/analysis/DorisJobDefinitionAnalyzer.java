package org.apache.seatunnel.plugin.datasource.doris.analysis;

import com.typesafe.config.Config;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.analysis.DatasourceAnalysisContext;
import org.apache.seatunnel.plugin.datasource.api.analysis.DatasourceAnalysisRole;
import org.apache.seatunnel.plugin.datasource.api.analysis.JobDefinitionAnalyzer;
import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.common.modal.JobDefinitionAnalysisResult;
import io.baize.flow.common.utils.JSONUtils;
import io.baize.flow.plugin.spi.enums.DbType;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Doris 任务定义分析器。
 *
 * <p>逻辑与 MySQL 完全一致，仅 sourceType / sinkType 使用 {@link DbType#DORIS}。</p>
 */
public class DorisJobDefinitionAnalyzer implements JobDefinitionAnalyzer {

    @Override
    public boolean supports(DatasourceAnalysisContext context) {
        return true;
    }

    @Override
    public JobDefinitionAnalysisResult analyze(DatasourceAnalysisContext context) {
        if (context == null) {
            return JobDefinitionAnalysisResult.builder().build();
        }

        if (context.getMode() == JobDefinitionMode.GUIDE_SINGLE) {
            return analyzeSingle(context);
        }

        if (context.getMode() == JobDefinitionMode.GUIDE_MULTI) {
            return analyzeMulti(context);
        }

        return analyzeScript(context);
    }

    // ======================== GUIDE_SINGLE ========================

    private JobDefinitionAnalysisResult analyzeSingle(DatasourceAnalysisContext context) {
        String table;
        if (context.getRole() == DatasourceAnalysisRole.SOURCE) {
            table = resolveSourceTable(context);
        } else {
            table = resolveSinkTable(context);
        }

        return buildResult(context.getRole(), context.getDatasourceId(), table);
    }

    private String resolveSourceTable(DatasourceAnalysisContext context) {
        return normalizeTable(safeGetString(context.getPluginConfig(), "table"));
    }

    private String resolveSinkTable(DatasourceAnalysisContext context) {
        String targetTableName = safeGetString(context.getPluginConfig(), "targetTableName");
        String table = safeGetString(context.getPluginConfig(), "table");
        return normalizeTable(StringUtils.isNotBlank(targetTableName) ? targetTableName : table);
    }

    // ======================== GUIDE_MULTI ========================

    private JobDefinitionAnalysisResult analyzeMulti(DatasourceAnalysisContext context) {
        List<String> tableList = resolveTableList(context);
        String tableJson = JSONUtils.toJsonString(tableList);
        return buildResult(context.getRole(), context.getDatasourceId(), tableJson);
    }

    private List<String> resolveTableList(DatasourceAnalysisContext context) {
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

    // ======================== SCRIPT ========================

    private JobDefinitionAnalysisResult analyzeScript(DatasourceAnalysisContext context) {
        String table;
        if (context.getRole() == DatasourceAnalysisRole.SOURCE) {
            table = normalizeTable(firstNonBlank(
                    safeGetString(context.getPluginConfig(), "table_path"),
                    safeGetString(context.getPluginConfig(), "table"),
                    safeGetString(context.getPluginConfig(), "table_name"),
                    safeGetString(context.getPluginConfig(), "query")
            ));
        } else {
            table = normalizeTable(firstNonBlank(
                    safeGetString(context.getPluginConfig(), "table"),
                    safeGetString(context.getPluginConfig(), "table_path"),
                    safeGetString(context.getPluginConfig(), "targetTableName"),
                    safeGetString(context.getPluginConfig(), "query")
            ));
        }

        return buildResult(context.getRole(), context.getDatasourceId(), table);
    }

    // ======================== Utilities ========================

    private JobDefinitionAnalysisResult buildResult(DatasourceAnalysisRole role, Long datasourceId, String table) {
        if (role == DatasourceAnalysisRole.SOURCE) {
            return JobDefinitionAnalysisResult.builder()
                    .sourceType(DbType.DORIS.name())
                    .sourceDatasourceId(datasourceId)
                    .sourceTable(StringUtils.trimToEmpty(table))
                    .build();
        }

        return JobDefinitionAnalysisResult.builder()
                .sinkType(DbType.DORIS.name())
                .sinkDatasourceId(datasourceId)
                .sinkTable(StringUtils.trimToEmpty(table))
                .build();
    }

    private static String safeGetString(Config config, String path) {
        try {
            if (config != null && config.hasPath(path)) {
                return StringUtils.trimToEmpty(config.getString(path));
            }
        } catch (Exception e) {
            // ignore
        }
        return "";
    }

    private static List<String> safeGetStringList(Config config, String path) {
        try {
            if (config != null && config.hasPath(path)) {
                return cleanTables(config.getStringList(path));
            }
        } catch (Exception e) {
            // ignore
        }
        return java.util.Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> safeMap(Object value) {
        if (value instanceof Map) {
            return (Map<String, Object>) value;
        }
        return java.util.Collections.emptyMap();
    }

    @SuppressWarnings("unchecked")
    private static List<String> getStringList(Map<String, Object> map, String key) {
        if (map == null || map.isEmpty() || key == null) {
            return java.util.Collections.emptyList();
        }
        Object value = map.get(key);
        if (!(value instanceof List)) {
            return java.util.Collections.emptyList();
        }
        List<Object> values = (List<Object>) value;
        List<String> result = new ArrayList<>();
        for (Object item : values) {
            if (item != null && StringUtils.isNotBlank(String.valueOf(item))) {
                result.add(normalizeTable(String.valueOf(item)));
            }
        }
        return result;
    }

    private static List<String> cleanTables(List<String> tables) {
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

    private static List<String> distinct(List<String> values) {
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

    private static String normalizeTable(String raw) {
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

    private static String firstNonBlank(String... values) {
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
}
