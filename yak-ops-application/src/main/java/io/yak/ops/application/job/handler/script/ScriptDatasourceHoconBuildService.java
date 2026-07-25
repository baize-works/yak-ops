package io.yak.ops.application.job.handler.script;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.HoconBuildContext;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.utils.DataSourceUtils;
import io.yak.ops.common.enums.HoconBuildStage;
import io.yak.ops.dao.entity.DataSource;
import io.yak.ops.dao.repository.DataSourceDao;
import io.yak.ops.plugin.spi.enums.DbType;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
public class ScriptDatasourceHoconBuildService {

    private static final String SOURCE = "source";
    private static final String SINK = "sink";

    private static final String KEY_DATASOURCE_ID = "datasourceId";
    private static final String KEY_DATA_SOURCE_ID = "dataSourceId";
    private static final String KEY_DATASOURCE_ID_UNDERLINE = "datasource_id";

    private static final String KEY_DB_TYPE = "dbType";
    private static final String KEY_DB_TYPE_UNDERLINE = "db_type";
    private static final String KEY_CONNECTOR_TYPE = "connectorType";
    private static final String KEY_PLUGIN_NAME = "pluginName";

    private final DataSourceDao dataSourceDao;
    private final ScriptHoconValidateService hoconValidateService;
    private final ScriptHoconRenderService hoconRenderService;

    public ScriptDatasourceHoconBuildService(DataSourceDao dataSourceDao,
                                             ScriptHoconValidateService hoconValidateService,
                                             ScriptHoconRenderService hoconRenderService) {
        this.dataSourceDao = dataSourceDao;
        this.hoconValidateService = hoconValidateService;
        this.hoconRenderService = hoconRenderService;
    }

    public Config buildPluginHocon(PluginConfig plugin, String section) {
        if (SOURCE.equals(section)) {
            return buildSourcePlugin(plugin);
        }

        if (SINK.equals(section)) {
            return buildSinkPlugin(plugin);
        }

        throw new IllegalArgumentException("Unsupported hocon section: " + section);
    }

    private Config buildSourcePlugin(PluginConfig plugin) {
        Long datasourceId = resolveDatasourceId(plugin.getConfig());
        DataSource dataSource = getRequiredDataSource(datasourceId, SOURCE);

        Config connectionConfig = parseConnectionConfig(dataSource);
        DbType dbType = resolveDbType(plugin, connectionConfig);

        DataSourceProcessor processor = getRequiredProcessor(dbType);

        String builderName = buildBuilderName(plugin, dbType);

        DataSourceHoconBuilder hoconBuilder = getRequiredHoconBuilder(processor, builderName, plugin);

        if (!hoconBuilder.supportsSource()) {
            throw new IllegalArgumentException(plugin.getPluginName() + " does not support source side");
        }

        Config nodeConfig = buildRuntimeNodeConfig(plugin.getConfig());

        HoconBuildContext buildContext = HoconBuildContext.builder()
                .connectionParam(dataSource.getConnectionParams())
                .connectionConfig(connectionConfig)
                .nodeConfig(nodeConfig)
                .stage(HoconBuildStage.INSTANCE)
                .build();

        Config sourceConfig = hoconBuilder.buildSourceHocon(buildContext);

        Config optionConfig = hoconRenderService.unwrapSinglePluginIfNecessary(
                hoconRenderService.unwrapSingleSectionIfNecessary(sourceConfig, SOURCE),
                plugin.getPluginName()
        );

        hoconValidateService.validateSourceConfig(processor, builderName, optionConfig);

        return sourceConfig;
    }

    private Config buildSinkPlugin(PluginConfig plugin) {
        Long datasourceId = resolveDatasourceId(plugin.getConfig());
        DataSource dataSource = getRequiredDataSource(datasourceId, SINK);

        Config connectionConfig = parseConnectionConfig(dataSource);
        DbType dbType = resolveDbType(plugin, connectionConfig);

        DataSourceProcessor processor = getRequiredProcessor(dbType);

        String builderName = buildBuilderName(plugin, dbType);

        DataSourceHoconBuilder hoconBuilder = getRequiredHoconBuilder(processor, builderName, plugin);

        if (!hoconBuilder.supportsSink()) {
            throw new IllegalArgumentException(plugin.getPluginName() + " does not support sink side");
        }

        Config nodeConfig = buildRuntimeNodeConfig(plugin.getConfig());

        HoconBuildContext buildContext = HoconBuildContext.builder()
                .connectionParam(dataSource.getConnectionParams())
                .connectionConfig(connectionConfig)
                .nodeConfig(nodeConfig)
                .stage(HoconBuildStage.INSTANCE)
                .build();

        Config sinkConfig = hoconBuilder.buildSinkHocon(buildContext);

        Config optionConfig = hoconRenderService.unwrapSinglePluginIfNecessary(
                hoconRenderService.unwrapSingleSectionIfNecessary(sinkConfig, SINK),
                plugin.getPluginName()
        );

        hoconValidateService.validateSinkConfig(processor, optionConfig);

        return sinkConfig;
    }

    /**
     * This is the core datasourceId replacement logic.
     * <p>
     * Web-side fields such as datasourceId/dbType/pluginName are only used
     * for finding datasource and selecting builder. They should not appear
     * in the final SeaTunnel HOCON.
     */
    private Config buildRuntimeNodeConfig(Config config) {
        if (config == null) {
            return ConfigFactory.empty();
        }

        Map<String, Object> map = new LinkedHashMap<>(config.root().unwrapped());

        map.remove(KEY_DATA_SOURCE_ID);
        map.remove(KEY_DATASOURCE_ID);
        map.remove(KEY_DATASOURCE_ID_UNDERLINE);

        map.remove(KEY_DB_TYPE);
        map.remove(KEY_DB_TYPE_UNDERLINE);
        map.remove(KEY_CONNECTOR_TYPE);
        map.remove(KEY_PLUGIN_NAME);

        return ConfigFactory.parseMap(map).resolve();
    }

    private Long resolveDatasourceId(Config config) {
        String value = firstNonBlank(
                safeGetString(config, KEY_DATA_SOURCE_ID),
                safeGetString(config, KEY_DATASOURCE_ID),
                safeGetString(config, KEY_DATASOURCE_ID_UNDERLINE)
        );

        if (StringUtils.isBlank(value)) {
            return null;
        }

        try {
            return Long.valueOf(value.trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid datasourceId: " + value, e);
        }
    }

    private DataSource getRequiredDataSource(Long datasourceId, String role) {
        if (datasourceId == null) {
            throw new IllegalArgumentException(role + " datasourceId can not be empty");
        }

        DataSource dataSource = dataSourceDao.queryById(datasourceId);
        if (dataSource == null) {
            throw new IllegalArgumentException(
                    role + " data source does not exist, datasourceId=" + datasourceId);
        }

        return dataSource;
    }

    private Config parseConnectionConfig(DataSource dataSource) {
        if (dataSource == null || StringUtils.isBlank(dataSource.getConnectionParams())) {
            throw new IllegalArgumentException("datasource connection params can not be empty");
        }

        return ConfigFactory.parseString(dataSource.getConnectionParams()).resolve();
    }

    private DbType resolveDbType(PluginConfig plugin, Config connectionConfig) {
        String dbTypeText = firstNonBlank(
                safeGetString(plugin.getConfig(), KEY_DB_TYPE),
                safeGetString(plugin.getConfig(), KEY_DB_TYPE_UNDERLINE),
                safeGetString(connectionConfig, KEY_DB_TYPE),
                safeGetString(connectionConfig, KEY_DB_TYPE_UNDERLINE)
        );

        DbType dbType = parseDbType(dbTypeText);
        if (dbType != null) {
            return dbType;
        }

        String url = firstNonBlank(
                safeGetString(connectionConfig, "url"),
                safeGetString(connectionConfig, "jdbcUrl"),
                safeGetString(connectionConfig, "jdbc_url")
        );

        dbType = DataSourceUtils.resolveDbTypeByJdbcUrl(url);
        if (dbType != null) {
            return dbType;
        }

        dbType = parseDbType(plugin.getPluginName());
        if (dbType != null) {
            return dbType;
        }

        throw new IllegalArgumentException("Can not resolve dbType, pluginName=" + plugin.getPluginName());
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

    private DataSourceProcessor getRequiredProcessor(DbType dbType) {
        DataSourceProcessor processor = DataSourceUtils.getDatasourceProcessor(dbType);
        if (processor == null) {
            throw new IllegalArgumentException("Can not find datasource processor, dbType=" + dbType);
        }
        return processor;
    }

    private DataSourceHoconBuilder getRequiredHoconBuilder(DataSourceProcessor processor,
                                                           String builderName,
                                                           PluginConfig plugin) {
        DataSourceHoconBuilder hoconBuilder = processor.getQueryBuilder(builderName);
        if (hoconBuilder == null) {
            throw new IllegalArgumentException("Can not find hocon builder, pluginName=" + plugin.getPluginName());
        }
        return hoconBuilder;
    }

    private String buildBuilderName(PluginConfig plugin, DbType dbType) {
        if (plugin.getPluginName().equalsIgnoreCase("Jdbc")) {
            return (plugin.getPluginName() + "-" + dbType).toUpperCase();
        } else {
            return plugin.getPluginName();
        }
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
}
