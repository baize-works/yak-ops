package org.apache.seatunnel.plugin.datasource.api.analysis.jdbc;

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
public abstract class AbstractJdbcJobDefinitionAnalyzer implements JobDefinitionAnalyzer {

    @Override
    public boolean supports(DatasourceAnalysisContext context) {
        return context != null
                && context.getDbType() != null
                && context.getDbType() == dbType();
    }

    @Override
    public JobDefinitionAnalysisResult analyze(DatasourceAnalysisContext context) {
        if (context == null) {
            return emptyResult();
        }

        if (context.getMode() == JobDefinitionMode.GUIDE_MULTI) {
            return analyzeGuideMulti(context);
        }

        if (context.getRole() == DatasourceAnalysisRole.SOURCE) {
            return buildResult(
                    context.getRole(),
                    context.getDatasourceId(),
                    resolveSourceTable(context)
            );
        }

        return buildResult(
                context.getRole(),
                context.getDatasourceId(),
                resolveSinkTable(context)
        );
    }

    protected JobDefinitionAnalysisResult analyzeGuideMulti(DatasourceAnalysisContext context) {
        List<String> tableList = resolveGuideMultiTableList(context);
        String tableJson = JSONUtils.toJsonString(tableList);

        return buildResult(
                context.getRole(),
                context.getDatasourceId(),
                tableJson
        );
    }

    protected String resolveSourceTable(DatasourceAnalysisContext context) {
        if (context.getMode() == JobDefinitionMode.SCRIPT) {
            return resolveFirstConfigTable(context, scriptSourceTableKeys());
        }

        return resolveFirstConfigTable(context, guideSingleSourceTableKeys());
    }

    protected String resolveSinkTable(DatasourceAnalysisContext context) {
        if (context.getMode() == JobDefinitionMode.SCRIPT) {
            return resolveFirstConfigTable(context, scriptSinkTableKeys());
        }

        return resolveFirstConfigTable(context, guideSingleSinkTableKeys());
    }

    protected String resolveFirstConfigTable(DatasourceAnalysisContext context, String[] keys) {
        if (context == null || keys == null || keys.length == 0) {
            return "";
        }

        for (String key : keys) {
            String value = safeGetString(context.getPluginConfig(), key);
            if (StringUtils.isNotBlank(value)) {
                return normalizeTable(value);
            }
        }

        return "";
    }

    protected List<String> resolveGuideMultiTableList(DatasourceAnalysisContext context) {
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

    protected JobDefinitionAnalysisResult buildResult(
            DatasourceAnalysisRole role,
            Long datasourceId,
            String table) {

        if (role == DatasourceAnalysisRole.SOURCE) {
            return JobDefinitionAnalysisResult.builder()
                    .sourceType(dbType().name())
                    .sourceDatasourceId(datasourceId)
                    .sourceTable(StringUtils.trimToEmpty(table))
                    .build();
        }

        return JobDefinitionAnalysisResult.builder()
                .sinkType(dbType().name())
                .sinkDatasourceId(datasourceId)
                .sinkTable(StringUtils.trimToEmpty(table))
                .build();
    }

    protected JobDefinitionAnalysisResult emptyResult() {
        return JobDefinitionAnalysisResult.builder().build();
    }

    protected String[] guideSingleSourceTableKeys() {
        return new String[]{
                "table_path",
                "table",
                "table_name"
        };
    }

    protected String[] guideSingleSinkTableKeys() {
        return new String[]{
                "targetTableName",
                "table",
                "table_path",
                "table_name"
        };
    }

    protected String[] scriptSourceTableKeys() {
        return new String[]{
                "table_path",
                "table",
                "table_name",
                "query"
        };
    }

    protected String[] scriptSinkTableKeys() {
        return new String[]{
                "table",
                "table_path",
                "targetTableName",
                "table_name",
                "query"
        };
    }

    protected String safeGetString(Config config, String path) {
        try {
            if (config != null && StringUtils.isNotBlank(path) && config.hasPath(path)) {
                return StringUtils.trimToEmpty(config.getString(path));
            }
        } catch (Exception e) {
            log.debug("Read jdbc job definition config failed, dbType={}, path={}", dbType(), path, e);
        }

        return "";
    }

    protected List<String> safeGetStringList(Config config, String path) {
        try {
            if (config != null && StringUtils.isNotBlank(path) && config.hasPath(path)) {
                return cleanTables(config.getStringList(path));
            }
        } catch (Exception e) {
            log.debug("Read jdbc job definition table list failed, dbType={}, path={}", dbType(), path, e);
        }

        return java.util.Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
    protected Map<String, Object> safeMap(Object value) {
        if (value instanceof Map) {
            return (Map<String, Object>) value;
        }
        return java.util.Collections.emptyMap();
    }

    @SuppressWarnings("unchecked")
    protected List<String> getStringList(Map<String, Object> map, String key) {
        if (map == null || map.isEmpty() || StringUtils.isBlank(key)) {
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

    protected List<String> cleanTables(List<String> tables) {
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

    protected List<String> distinct(List<String> values) {
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

    protected String normalizeTable(String raw) {
        if (raw == null) {
            return "";
        }

        String value = raw.trim();

        if (StringUtils.isBlank(value)) {
            return "";
        }

        value = value.replace("`", "");
        value = value.replace("\".\"", ".");
        value = value.replace("`.`", ".");
        value = value.replace("[", "");
        value = value.replace("]", "");

        if (value.startsWith("\"") && value.endsWith("\"") && value.length() > 1) {
            value = value.substring(1, value.length() - 1);
        }

        return value.trim();
    }

    protected abstract DbType dbType();
}
