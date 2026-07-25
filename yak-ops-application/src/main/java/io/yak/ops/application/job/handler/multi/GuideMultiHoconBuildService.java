package io.yak.ops.application.job.handler.multi;

import javax.annotation.Resource;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.application.support.builder.HoconConfigBuilder;
import io.yak.ops.domain.dag.DagGraph;
import io.yak.ops.application.job.handler.JobRuntimeContext;
import io.yak.ops.application.job.handler.JobRuntimeContextFactory;
import io.yak.ops.application.support.dag.DagUtil;
import io.yak.ops.web.contract.dto.command.JobDefinitionSaveCommand;
import io.yak.ops.web.contract.dto.config.GuideMultiJobContent;
import io.yak.ops.web.contract.dto.config.JobEnvConfig;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class GuideMultiHoconBuildService {

    private static final String SOURCE_NODE_ID = "guide-multi-source";
    private static final String SINK_NODE_ID = "guide-multi-sink";
    private static final String EDGE_ID = "guide-multi-source-to-sink";

    private static final String NODE_TYPE_SOURCE = "source";
    private static final String NODE_TYPE_SINK = "sink";

    private static final String KEY_MULTI_TABLE = "multiTable";
    private static final String KEY_TABLE_LIST = "table_list";
    private static final String KEY_SOURCE_TABLE_LIST = "source_table_list";
    private static final String KEY_SINK_TABLE_LIST = "sink_table_list";
    private static final String KEY_TABLE_PATTERN = "tablePattern";

    private static final String KEY_MATCH_MODE = "matchMode";
    private static final String KEY_MATCH_MODE_UNDERLINE = "match_mode";
    private static final String KEY_SOURCE_TABLE = "sourceTable";
    private static final String KEY_TABLE_KEYWORD = "tableKeyword";

    private static final String MATCH_MODE_CUSTOM = "1";
    private static final String MATCH_MODE_REGEX = "2";
    private static final String MATCH_MODE_EXACT = "3";
    private static final String MATCH_MODE_WHOLE_DATABASE = "4";

    @Resource
    private HoconConfigBuilder hoconConfigBuilder;

    @Resource
    private GuideMultiTableMatchResolver tableMatchResolver;

    @Resource
    private JobRuntimeContextFactory runtimeContextFactory;

    public String build(GuideMultiJobContent content, JobDefinitionSaveCommand command) {
        validateContent(content);

        JobRuntimeContext runtimeContext = runtimeContextFactory.create(command);

        Map<String, Object> workflow = buildWorkflow(content, runtimeContext);

        String dagJson = JSONUtils.toJsonString(workflow);
        if (StringUtils.isBlank(dagJson)) {
            throw new IllegalArgumentException("guide multi workflow can not be blank");
        }

        DagGraph dagGraph = DagUtil.parseAndCheck(dagJson);

        return hoconConfigBuilder.build(dagGraph, runtimeContext.getEnv());
    }

    private Map<String, Object> buildWorkflow(
            GuideMultiJobContent content,
            JobRuntimeContext runtimeContext) {

        GuideMultiJobContent.TableMatchConfig tableMatch = content.getTableMatch();
        String matchMode = resolveMatchMode(tableMatch);
        boolean patternMode = isPatternMode(matchMode);

        /*
         * 正则匹配 / 整库同步不再提前解析所有表。
         *
         * mode = 2: MySQL-CDC source 使用 table-pattern
         * mode = 4: MySQL-CDC source 使用 table-pattern = db\..*
         *
         * 自定义 / 精准匹配仍然走 tableMatchResolver，生成 table-names。
         */
        List<String> sourceTables = patternMode
                ? java.util.Collections.emptyList()
                : tableMatchResolver.resolveSourceTables(content);

        List<String> sinkTables = patternMode
                ? java.util.Collections.emptyList()
                : tableMatchResolver.resolveSinkTables(content);

        validateTables(tableMatch, sourceTables, sinkTables);

        Map<String, Object> sourceNode = buildSourceNode(
                content.getSource(),
                tableMatch,
                sourceTables,
                runtimeContext);

        Map<String, Object> sinkNode = buildSinkNode(
                content.getTarget(),
                tableMatch,
                sinkTables,
                runtimeContext);

        Map<String, Object> edge = new LinkedHashMap<>();
        edge.put("id", EDGE_ID);
        edge.put("source", SOURCE_NODE_ID);
        edge.put("target", SINK_NODE_ID);

        Map<String, Object> workflow = new LinkedHashMap<>();
        workflow.put("nodes", Arrays.asList(sourceNode, sinkNode));
        workflow.put("edges", Collections.singletonList(edge));

        return workflow;
    }

    private Map<String, Object> buildSourceNode(
            GuideMultiJobContent.WorkflowSourceConfig source,
            GuideMultiJobContent.TableMatchConfig tableMatch,
            List<String> sourceTables,
            JobRuntimeContext runtimeContext) {

        String matchMode = resolveMatchMode(tableMatch);
        String keyword = resolveKeyword(tableMatch);
        boolean patternMode = isPatternMode(matchMode);

        boolean multiTable = patternMode || sourceTables.size() > 1;
        String firstSourceTable = firstTable(sourceTables);

        Map<String, Object> config = new LinkedHashMap<>();

        putIfNotBlank(config, "dataSourceId", source.getDatasourceId());
        putIfNotBlank(config, "dbType", source.getDbType());
        putIfNotBlank(config, "connectorType", source.getConnectorType());
        putIfNotBlank(config, "pluginName", source.getPluginName());

        config.put("readMode", "table");

        /*
         * 正则匹配 / 整库同步不需要 table / table_path。
         * 否则后面的 CDC resolver 容易误判成单表或多表列表模式。
         */
        if (!patternMode) {
            putIfNotBlank(config, "table", firstSourceTable);
            putIfNotBlank(config, "table_path", firstSourceTable);
        }

        config.put(KEY_MULTI_TABLE, multiTable);

        putIfNotBlank(config, KEY_MATCH_MODE, matchMode);
        putIfNotBlank(config, KEY_MATCH_MODE_UNDERLINE, matchMode);

        /*
         * mode = 2 正则匹配：
         * 把前端输入的 keyword 透传给 CDC resolver。
         *
         * MultiTableCdcTableOptionResolver 里根据 matchMode=2
         * 生成 SeaTunnel CDC 原生 table-pattern。
         */
        if (MATCH_MODE_REGEX.equals(matchMode)) {
            putIfNotBlank(config, KEY_SOURCE_TABLE, keyword);
            putIfNotBlank(config, KEY_TABLE_KEYWORD, keyword);
        }

        /*
         * 自定义 / 精准匹配才需要 table list。
         * 正则 / 整库同步不要塞 source_table_list，避免后续又生成 table-names。
         */
        if (!patternMode) {
            putListIfNotEmpty(config, KEY_TABLE_LIST, sourceTables);
            putListIfNotEmpty(config, KEY_SOURCE_TABLE_LIST, sourceTables);
        }

        appendRuntimeConfig(config, runtimeContext);

        if (source.getFetchSize() != null) {
            config.put("fetchSize", source.getFetchSize());
        }

        if (source.getSplitSize() != null) {
            config.put("splitSize", source.getSplitSize());
        }

        putIfNotBlank(config, "server-id", source.getServerId());
        putIfNotBlank(config, "serverIdMode", source.getServerIdMode());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("nodeType", NODE_TYPE_SOURCE);
        data.put("title", defaultIfBlank(source.getDbType(), "Source"));

        data.put("dataSourceId", source.getDatasourceId());
        data.put("dbType", source.getDbType());
        data.put("connectorType", source.getConnectorType());
        data.put("pluginName", source.getPluginName());

        appendRuntimeConfig(data, runtimeContext);

        data.putAll(config);
        data.put("config", config);

        Map<String, Object> node = new LinkedHashMap<>();
        node.put("id", SOURCE_NODE_ID);
        node.put("type", NODE_TYPE_SOURCE);
        node.put("data", data);

        return node;
    }

    private Map<String, Object> buildSinkNode(
            GuideMultiJobContent.WorkflowTargetConfig target,
            GuideMultiJobContent.TableMatchConfig tableMatch,
            List<String> sinkTables,
            JobRuntimeContext runtimeContext) {

        String matchMode = resolveMatchMode(tableMatch);
        boolean patternMode = isPatternMode(matchMode);

        boolean multiTable = patternMode || sinkTables.size() > 1;
        String firstSinkTable = firstTable(sinkTables);

        Map<String, Object> config = new LinkedHashMap<>();

        putIfNotBlank(config, "dataSourceId", target.getDatasourceId());
        putIfNotBlank(config, "dbType", target.getDbType());
        putIfNotBlank(config, "connectorType", target.getConnectorType());
        putIfNotBlank(config, "pluginName", target.getPluginName());

        config.put(KEY_MULTI_TABLE, multiTable);

        putIfNotBlank(config, KEY_MATCH_MODE, matchMode);
        putIfNotBlank(config, KEY_MATCH_MODE_UNDERLINE, matchMode);

        if (!patternMode) {
            putListIfNotEmpty(config, KEY_TABLE_LIST, sinkTables);
            putListIfNotEmpty(config, KEY_SINK_TABLE_LIST, sinkTables);
        }

        /*
         * 多表 / 正则 / 整库同步统一走动态表名。
         * Source CDC 会带出 table_name，Sink 使用 ${table_name} 自动写入对应表。
         */
        if (multiTable) {
            config.put(KEY_TABLE_PATTERN, "${table_name}");
        } else {
            putIfNotBlank(config, "table", firstSinkTable);
            putIfNotBlank(config, "table_path", firstSinkTable);
            putIfNotBlank(config, "targetTableName", firstSinkTable);
        }

        appendRuntimeConfig(config, runtimeContext);

        putIfNotBlank(config, "dataSaveMode", target.getDataSaveMode());
        putIfNotBlank(config, "schemaSaveMode", target.getSchemaSaveMode());
        putIfNotBlank(config, "fieldIde", target.getFieldIde());

        putIfNotBlank(config, "data_save_mode", target.getDataSaveMode());
        putIfNotBlank(config, "schema_save_mode", target.getSchemaSaveMode());
        putIfNotBlank(config, "field_ide", target.getFieldIde());

        if (target.getBatchSize() != null) {
            config.put("batchSize", target.getBatchSize());
            config.put("batch_size", target.getBatchSize());
        }

        if (target.getEnableUpsert() != null) {
            config.put("enableUpsert", target.getEnableUpsert());
            config.put("enable_upsert", target.getEnableUpsert());
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("nodeType", NODE_TYPE_SINK);
        data.put("title", defaultIfBlank(target.getDbType(), "Sink"));

        data.put("dataSourceId", target.getDatasourceId());
        data.put("dbType", target.getDbType());
        data.put("connectorType", target.getConnectorType());
        data.put("pluginName", target.getPluginName());

        appendRuntimeConfig(data, runtimeContext);

        data.putAll(config);
        data.put("config", config);

        Map<String, Object> node = new LinkedHashMap<>();
        node.put("id", SINK_NODE_ID);
        node.put("type", NODE_TYPE_SINK);
        node.put("data", data);

        return node;
    }

    private void appendRuntimeConfig(Map<String, Object> target, JobRuntimeContext runtimeContext) {
        if (target == null || runtimeContext == null) {
            return;
        }

        JobEnvConfig env = runtimeContext.getEnv();
        if (env == null) {
            return;
        }

        if (env.getJobMode() != null) {
            target.put("jobMode", env.getJobMode().name());
            target.put("job_mode", env.getJobMode().name());
        }

        if (env.getParallelism() != null) {
            target.put("parallelism", env.getParallelism());
        }
    }

    private void validateContent(GuideMultiJobContent content) {
        if (content == null) {
            throw new IllegalArgumentException("content can not be null");
        }

        if (content.getSource() == null) {
            throw new IllegalArgumentException("content.source can not be null");
        }

        if (content.getTarget() == null) {
            throw new IllegalArgumentException("content.target can not be null");
        }

        if (content.getTableMatch() == null) {
            throw new IllegalArgumentException("content.tableMatch can not be null");
        }

        validateSource(content.getSource());
        validateTarget(content.getTarget());
    }

    private void validateSource(GuideMultiJobContent.WorkflowSourceConfig source) {
        if (StringUtils.isBlank(source.getDatasourceId())) {
            throw new IllegalArgumentException("source.datasourceId can not be blank");
        }

        if (StringUtils.isBlank(source.getDbType())) {
            throw new IllegalArgumentException("source.dbType can not be blank");
        }

        if (StringUtils.isBlank(source.getConnectorType())) {
            throw new IllegalArgumentException("source.connectorType can not be blank");
        }

        if (StringUtils.isBlank(source.getPluginName())) {
            throw new IllegalArgumentException("source.pluginName can not be blank");
        }
    }

    private void validateTarget(GuideMultiJobContent.WorkflowTargetConfig target) {
        if (StringUtils.isBlank(target.getDatasourceId())) {
            throw new IllegalArgumentException("target.datasourceId can not be blank");
        }

        if (StringUtils.isBlank(target.getDbType())) {
            throw new IllegalArgumentException("target.dbType can not be blank");
        }

        if (StringUtils.isBlank(target.getConnectorType())) {
            throw new IllegalArgumentException("target.connectorType can not be blank");
        }

        if (StringUtils.isBlank(target.getPluginName())) {
            throw new IllegalArgumentException("target.pluginName can not be blank");
        }
    }

    private void validateTables(
            GuideMultiJobContent.TableMatchConfig tableMatch,
            List<String> sourceTables,
            List<String> sinkTables) {

        String matchMode = resolveMatchMode(tableMatch);

        /*
         * 正则匹配：只校验 keyword。
         * 不要求提前解析出所有表。
         */
        if (MATCH_MODE_REGEX.equals(matchMode)) {
            if (StringUtils.isBlank(resolveKeyword(tableMatch))) {
                throw new IllegalArgumentException("table match keyword can not be blank when match mode is regex");
            }
            return;
        }

        /*
         * 整库同步：直接交给 CDC table-pattern = db\..*
         * 不要求 sourceTables / sinkTables。
         */
        if (MATCH_MODE_WHOLE_DATABASE.equals(matchMode)) {
            return;
        }

        /*
         * 自定义 / 精准匹配：仍然需要明确的表列表。
         */
        if (CollectionUtils.isEmpty(sourceTables)) {
            throw new IllegalArgumentException("source tables can not be empty");
        }

        if (CollectionUtils.isEmpty(sinkTables)) {
            throw new IllegalArgumentException("sink tables can not be empty");
        }

        if (sourceTables.size() != sinkTables.size()) {
            throw new IllegalArgumentException("source tables and sink tables size must be equal");
        }
    }

    private String resolveMatchMode(GuideMultiJobContent.TableMatchConfig tableMatch) {
        if (tableMatch == null || tableMatch.getMode() == null) {
            return MATCH_MODE_CUSTOM;
        }

        String mode = String.valueOf(tableMatch.getMode()).trim();

        if (MATCH_MODE_CUSTOM.equals(mode)) {
            return MATCH_MODE_CUSTOM;
        }

        if (MATCH_MODE_REGEX.equals(mode)) {
            return MATCH_MODE_REGEX;
        }

        if (MATCH_MODE_EXACT.equals(mode)) {
            return MATCH_MODE_EXACT;
        }

        if (MATCH_MODE_WHOLE_DATABASE.equals(mode)) {
            return MATCH_MODE_WHOLE_DATABASE;
        }

        return mode;
    }

    private String resolveKeyword(GuideMultiJobContent.TableMatchConfig tableMatch) {
        if (tableMatch == null) {
            return null;
        }

        return StringUtils.trimToNull(tableMatch.getKeyword());
    }

    private boolean isPatternMode(String matchMode) {
        return MATCH_MODE_REGEX.equals(matchMode)
                || MATCH_MODE_WHOLE_DATABASE.equals(matchMode);
    }

    private String firstTable(List<String> tables) {
        if (CollectionUtils.isEmpty(tables)) {
            return "";
        }

        for (String table : tables) {
            if (StringUtils.isNotBlank(table)) {
                return table.trim();
            }
        }

        return "";
    }

    private void putIfNotBlank(Map<String, Object> map, String key, String value) {
        if (StringUtils.isNotBlank(value)) {
            map.put(key, value.trim());
        }
    }

    private void putListIfNotEmpty(Map<String, Object> map, String key, List<String> values) {
        if (CollectionUtils.isNotEmpty(values)) {
            map.put(key, values);
        }
    }

    private String defaultIfBlank(String value, String defaultValue) {
        return StringUtils.isBlank(value) ? defaultValue : value.trim();
    }
}
