package io.baize.flow.application.job.handler.script;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigException;
import com.typesafe.config.ConfigFactory;
import com.typesafe.config.ConfigValue;
import com.typesafe.config.ConfigValueType;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.analysis.DatasourceAnalysisContext;
import org.apache.seatunnel.plugin.datasource.api.analysis.DatasourceAnalysisRole;
import org.apache.seatunnel.plugin.datasource.api.analysis.JobDefinitionAnalyzer;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.utils.DataSourceUtils;
import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.common.modal.JobDefinitionAnalysisResult;
import io.baize.flow.common.utils.JSONUtils;
import io.baize.flow.plugin.spi.enums.DbType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Component
public class ScriptJobDefinitionParser {

    @Resource
    private DataSourceMetadataResolver dataSourceMetadataResolver;

    public Config parseAndValidate(String hoconContent) {
        if (StringUtils.isBlank(hoconContent)) {
            throw new IllegalArgumentException("hoconContent can not be blank");
        }

        try {
            Config config = ConfigFactory.parseString(hoconContent).resolve();
            config.root().render();
            return config;
        } catch (ConfigException e) {
            log.warn("Invalid hocon content", e);
            throw new IllegalArgumentException("invalid hocon content: " + e.getMessage(), e);
        } catch (Exception e) {
            log.warn("Parse hocon content failed", e);
            throw new IllegalArgumentException("parse hocon content failed: " + e.getMessage(), e);
        }
    }

    public JobDefinitionAnalysisResult analyze(String hoconContent) {
        Config config = parseAndValidate(hoconContent);

        List<PluginConfig> sourcePlugins = getPluginConfigs(config, "source");
        List<PluginConfig> sinkPlugins = getPluginConfigs(config, "sink");

        Set<String> sourceTypes = new LinkedHashSet<>();
        Set<String> sinkTypes = new LinkedHashSet<>();
        Set<Long> sourceDatasourceIds = new LinkedHashSet<>();
        Set<Long> sinkDatasourceIds = new LinkedHashSet<>();
        Set<String> sourceTables = new LinkedHashSet<>();
        Set<String> sinkTables = new LinkedHashSet<>();

        for (PluginConfig plugin : sourcePlugins) {
            JobDefinitionAnalysisResult result = analyzePlugin(
                    DatasourceAnalysisRole.SOURCE,
                    plugin,
                    hoconContent
            );

            addIfNotBlank(sourceTypes, result.getSourceType());
            addIfNotNull(sourceDatasourceIds, result.getSourceDatasourceId());
            addTableValues(sourceTables, result.getSourceTable());
        }

        for (PluginConfig plugin : sinkPlugins) {
            JobDefinitionAnalysisResult result = analyzePlugin(
                    DatasourceAnalysisRole.SINK,
                    plugin,
                    hoconContent
            );

            addIfNotBlank(sinkTypes, result.getSinkType());
            addIfNotNull(sinkDatasourceIds, result.getSinkDatasourceId());
            addTableValues(sinkTables, result.getSinkTable());
        }

        return JobDefinitionAnalysisResult.builder()
                .sourceType(joinAsCsv(sourceTypes))
                .sinkType(joinAsCsv(sinkTypes))
                .sourceDatasourceId(firstLong(sourceDatasourceIds))
                .sinkDatasourceId(firstLong(sinkDatasourceIds))
                .sourceTable(JSONUtils.toJsonString(new ArrayList<>(sourceTables)))
                .sinkTable(JSONUtils.toJsonString(new ArrayList<>(sinkTables)))
                .build();
    }

    private JobDefinitionAnalysisResult analyzePlugin(DatasourceAnalysisRole role,
                                                      PluginConfig plugin,
                                                      String hoconContent) {
        if (plugin == null || plugin.getConfig() == null) {
            return JobDefinitionAnalysisResult.builder().build();
        }

        Long datasourceId = resolveDatasourceId(plugin.getConfig());
        DbType dbType = resolveDbType(plugin, datasourceId);

        if (dbType == null) {
            log.debug(
                    "Can not resolve dbType for script plugin, pluginName={}, datasourceId={}",
                    plugin.getPluginName(),
                    datasourceId
            );
            return JobDefinitionAnalysisResult.builder().build();
        }

        DataSourceProcessor processor = DataSourceUtils.getDatasourceProcessor(dbType);
        if (processor == null || processor.getJobDefinitionAnalyzer() == null) {
            log.debug("Can not find datasource processor or analyzer, dbType={}", dbType);
            return JobDefinitionAnalysisResult.builder().build();
        }

        JobDefinitionAnalyzer analyzer = processor.getJobDefinitionAnalyzer();

        DatasourceAnalysisContext context = DatasourceAnalysisContext.builder()
                .mode(JobDefinitionMode.SCRIPT)
                .role(role)
                .dbType(dbType)
                .pluginName(plugin.getPluginName())
                .datasourceId(datasourceId)
                .pluginConfig(plugin.getConfig())
                .rawContent(hoconContent)
                .build();

        return analyzer.analyze(context);
    }

    private DbType resolveDbType(PluginConfig plugin, Long datasourceId) {
        DbType datasourceDbType = dataSourceMetadataResolver.resolveDbType(datasourceId);
        if (datasourceDbType != null) {
            return datasourceDbType;
        }

        Config config = plugin.getConfig();

        String dbTypeText = firstNonBlank(
                safeGetString(config, "dbType"),
                safeGetString(config, "db_type"),
                safeGetString(config, "database_type")
        );

        if (StringUtils.isNotBlank(dbTypeText)) {
            DbType dbType = parseDbType(dbTypeText);
            if (dbType != null) {
                return dbType;
            }
        }

        String url = firstNonBlank(
                safeGetString(config, "url"),
                safeGetString(config, "jdbcUrl"),
                safeGetString(config, "jdbc_url")
        );

        DbType dbType = DataSourceUtils.resolveDbTypeByJdbcUrl(url);
        if (dbType != null) {
            return dbType;
        }

        return parseDbType(plugin.getPluginName());
    }

    private DbType parseDbType(String value) {
        if (StringUtils.isBlank(value)) {
            return null;
        }

        String normalized = value.trim()
                .replace("-", "_")
                .toUpperCase();

        if (normalized.startsWith("JDBC_")) {
            normalized = normalized.substring("JDBC_".length());
        }

        try {
            return DbType.valueOf(normalized);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private Long resolveDatasourceId(Config config) {
        String value = firstNonBlank(
                safeGetString(config, "dataSourceId"),
                safeGetString(config, "datasourceId"),
                safeGetString(config, "datasource_id")
        );

        if (StringUtils.isBlank(value)) {
            return null;
        }

        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    public List<PluginConfig> getPluginConfigs(Config rootConfig, String path) {
        List<PluginConfig> result = new ArrayList<>();

        if (rootConfig == null || !rootConfig.hasPath(path)) {
            return result;
        }

        try {
            List<? extends Config> configList = rootConfig.getConfigList(path);
            for (Config item : configList) {
                result.addAll(extractPluginConfigsFromSingleBlock(item));
            }
            if (!result.isEmpty()) {
                return result;
            }
        } catch (Exception ignore) {
            // ignore
        }

        try {
            Config block = rootConfig.getConfig(path);
            result.addAll(extractPluginConfigsFromSingleBlock(block));
        } catch (Exception ignore) {
            // ignore
        }

        return result;
    }

    /**
     * 从单个 source/sink block 中提取插件节点。
     *
     * 兼容：
     * source {
     *   Jdbc { ... }
     * }
     *
     * 也兼容：
     * source {
     *   plugin_name = "Jdbc"
     *   ...
     * }
     */
    private List<PluginConfig> extractPluginConfigsFromSingleBlock(Config block) {
        List<PluginConfig> result = new ArrayList<>();
        if (block == null) {
            return result;
        }

        String explicitPluginType = resolvePluginType(block);
        if (!"UNKNOWN".equals(explicitPluginType)) {
            result.add(new PluginConfig(explicitPluginType, block));
            return result;
        }

        Set<Map.Entry<String, ConfigValue>> entries = block.root().entrySet();
        for (Map.Entry<String, ConfigValue> entry : entries) {
            String key = entry.getKey();
            ConfigValue value = entry.getValue();

            if (value != null && value.valueType() == ConfigValueType.OBJECT) {
                try {
                    Config pluginConfig = block.getConfig(key);
                    result.add(new PluginConfig(key, pluginConfig));
                } catch (Exception e) {
                    log.debug("Read nested plugin config failed, key={}", key, e);
                }
            }
        }

        return result;
    }

    private String resolvePluginType(Config config) {
        if (config == null) {
            return "UNKNOWN";
        }

        String pluginType = firstNonBlank(
                safeGetString(config, "plugin_name"),
                safeGetString(config, "pluginName"),
                safeGetString(config, "factory"),
                safeGetString(config, "type")
        );

        return StringUtils.isBlank(pluginType) ? "UNKNOWN" : pluginType;
    }

    private String safeGetString(Config config, String path) {
        try {
            if (config != null && config.hasPath(path)) {
                return StringUtils.trimToEmpty(config.getString(path));
            }
        } catch (Exception e) {
            log.debug("Read config string failed, path={}", path, e);
        }
        return "";
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

    private void addIfNotBlank(Set<String> values, String value) {
        if (StringUtils.isNotBlank(value)) {
            values.add(value.trim());
        }
    }

    private void addIfNotNull(Set<Long> values, Long value) {
        if (value != null) {
            values.add(value);
        }
    }

    /**
     * 兼容 analyzer 返回：
     * 1. 单表：test_user
     * 2. 多表 JSON：["test_user","test_order"]
     */
    private void addTableValues(Set<String> values, String tableValue) {
        if (StringUtils.isBlank(tableValue)) {
            return;
        }

        String text = tableValue.trim();
        if (text.startsWith("[") && text.endsWith("]")) {
            try {
                Config config = ConfigFactory.parseString("tables = " + text);
                List<String> tables = config.getStringList("tables");
                for (String table : tables) {
                    addIfNotBlank(values, table);
                }
                return;
            } catch (Exception e) {
                log.debug("Parse table json list failed, value={}", tableValue, e);
            }
        }

        addIfNotBlank(values, text);
    }

    private Long firstLong(Set<Long> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.iterator().next();
    }

    private String joinAsCsv(Set<String> values) {
        List<String> cleaned = new ArrayList<>();
        for (String value : values) {
            if (StringUtils.isNotBlank(value)) {
                cleaned.add(value.trim());
            }
        }
        return String.join(",", cleaned);
    }


}
