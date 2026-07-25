package io.baize.flow.application.support.builder.source;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.HoconBuildContext;
import org.apache.seatunnel.plugin.datasource.api.utils.DataSourceUtils;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import io.baize.flow.common.config.ConfigValidator;
import io.baize.flow.common.config.ReadonlyConfig;
import io.baize.flow.common.enums.HoconBuildStage;
import io.baize.flow.application.support.builder.context.DagBuildContext;
import io.baize.flow.application.support.time.TimeVariableJdbcSqlRenderService;
import io.baize.flow.dao.entity.DataSource;
import io.baize.flow.dao.repository.DataSourceDao;
import io.baize.flow.web.contract.dto.config.JobScheduleConfig;
import io.baize.flow.plugin.spi.enums.DbType;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class DataSourceSourceBuilder implements SourceNodeConfigBuilder {

    private static final String NODE_TYPE = "source";

    private static final String KEY_DATA_SOURCE_ID = "dataSourceId";
    private static final String KEY_DB_TYPE = "dbType";
    private static final String KEY_PLUGIN_NAME = "pluginName";
    private static final String KEY_CONNECTOR_TYPE = "connectorType";

    private static final String KEY_SQL = "sql";
    private static final String KEY_WHERE_CONDITION = "where_condition";

    @Resource
    private DataSourceDao dataSourceDao;

    @Resource
    private TimeVariableJdbcSqlRenderService timeVariableJdbcSqlRenderService;

    @Override
    public String nodeType() {
        return NODE_TYPE;
    }

    @Override
    public Config build(Config data) {
        return build(data, DagBuildContext.empty());
    }

    @Override
    public Config build(Config data, DagBuildContext dagContext) {
        Config nodeConfig = resolveNodeConfig(data);
        nodeConfig = appendPluginOutputIfNecessary(data, nodeConfig, dagContext);

        Long dataSourceId = parseDataSourceId(nodeConfig);
        DataSource dataSource = getRequiredDataSource(dataSourceId);

        DbType dbType = parseDbType(nodeConfig);
        String pluginName = getRequiredPluginName(nodeConfig);

        DataSourceProcessor processor = DataSourceUtils.getDatasourceProcessor(dbType);
        DataSourceHoconBuilder hoconBuilder = processor.getQueryBuilder(pluginName);

        if (!hoconBuilder.supportsSource()) {
            throw new IllegalArgumentException(pluginName + " does not support source side");
        }

        nodeConfig = renderTimeVariablesIfNecessary(
                nodeConfig,
                hoconBuilder,
                dagContext.getScheduleConfig()
        );

        Config connectionConfig = ConfigFactory.parseString(dataSource.getConnectionParams());

        HoconBuildContext buildContext = HoconBuildContext.builder()
                .connectionParam(dataSource.getConnectionParams())
                .connectionConfig(connectionConfig)
                .nodeConfig(nodeConfig)
                .scheduleConfig(dagContext.getScheduleConfig())
                .stage(HoconBuildStage.INSTANCE)
                .build();

        Config sourceConfig = hoconBuilder.buildSourceHocon(buildContext);

        validateSourceConfig(processor, pluginName, sourceConfig);

        return sourceConfig;
    }

    private Config renderTimeVariablesIfNecessary(Config config,
                                                  DataSourceHoconBuilder hoconBuilder,
                                                  JobScheduleConfig scheduleConfig) {
        /*
         * 这里先只处理 JDBC SQL 类场景。
         * CDC 一般不需要渲染 sql / where_condition。
         */
        Map<String, Object> extra = new HashMap<>();

        renderSqlFragmentIfNecessary(config, hoconBuilder, scheduleConfig, KEY_SQL, extra);
        renderSqlFragmentIfNecessary(config, hoconBuilder, scheduleConfig, KEY_WHERE_CONDITION, extra);

        if (extra.isEmpty()) {
            return config;
        }

        return ConfigFactory.parseMap(extra)
                .withFallback(config)
                .resolve();
    }

    private void renderSqlFragmentIfNecessary(Config config,
                                              DataSourceHoconBuilder hoconBuilder,
                                              JobScheduleConfig scheduleConfig,
                                              String key,
                                              Map<String, Object> extra) {
        String value = getTrimmedString(config, key);
        if (StringUtils.isBlank(value)) {
            return;
        }

        String renderedValue = timeVariableJdbcSqlRenderService.renderSql(
                value,
                hoconBuilder,
                scheduleConfig
        );

        extra.put(key, renderedValue);
    }

    private Config appendPluginOutputIfNecessary(Config data,
                                                 Config config,
                                                 DagBuildContext context) {
        if (context == null || !context.hasTransform()) {
            return config;
        }

        String pluginOutput = getTrimmedString(config, "pluginOutput");
        if (StringUtils.isBlank(pluginOutput)) {
            pluginOutput = getTrimmedString(data, "pluginOutput");
        }

        if (StringUtils.isBlank(pluginOutput)) {
            return config;
        }

        Map<String, Object> extra = new HashMap<>();
        extra.put("plugin_output", pluginOutput);

        return ConfigFactory.parseMap(extra).withFallback(config).resolve();
    }

    @Override
    public String connectorName(Config data) {
        String dbTypeValue = getTrimmedString(data, KEY_DB_TYPE);
        if ("DORIS".equalsIgnoreCase(dbTypeValue)) {
            return "Doris";
        }

        String connectorType = getTrimmedString(data, KEY_CONNECTOR_TYPE);
        if (StringUtils.isNotBlank(connectorType)) {
            return connectorType;
        }

        throw new IllegalArgumentException(
                "Missing connector name, field '" + KEY_CONNECTOR_TYPE + "' is not provided");
    }

    private Long parseDataSourceId(Config config) {
        String value = getTrimmedString(config, KEY_DATA_SOURCE_ID);
        if (StringUtils.isBlank(value)) {
            throw new IllegalArgumentException(
                    "Missing required field '" + KEY_DATA_SOURCE_ID + "' in source node config");
        }

        try {
            return Long.valueOf(value);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(
                    "Invalid '" + KEY_DATA_SOURCE_ID + "': " + value + ", expected numeric value", e);
        }
    }

    private DataSource getRequiredDataSource(Long dataSourceId) {
        DataSource dataSource = dataSourceDao.queryById(dataSourceId);
        if (dataSource == null) {
            throw new IllegalArgumentException(
                    "Source data source does not exist, dataSourceId=" + dataSourceId);
        }
        return dataSource;
    }

    private DbType parseDbType(Config config) {
        String dbTypeValue = getTrimmedString(config, KEY_DB_TYPE);
        if (StringUtils.isBlank(dbTypeValue)) {
            throw new IllegalArgumentException(
                    "Missing required field '" + KEY_DB_TYPE + "' in source node config");
        }

        try {
            return DbType.valueOf(dbTypeValue);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unsupported dbType: " + dbTypeValue, e);
        }
    }

    private String getRequiredPluginName(Config config) {
        String pluginName = getTrimmedString(config, KEY_PLUGIN_NAME);
        if (StringUtils.isBlank(pluginName)) {
            throw new IllegalArgumentException(
                    "Missing required field '" + KEY_PLUGIN_NAME + "' in source node config");
        }
        return pluginName.toUpperCase();
    }

    private void validateSourceConfig(DataSourceProcessor processor,
                                      String pluginName,
                                      Config sourceConfig) {
        ConfigValidator.of(ReadonlyConfig.fromConfig(sourceConfig))
                .validate(processor.sourceOptionRule(pluginName));
    }

    private String getTrimmedString(Config config, String path) {
        if (config == null || !config.hasPath(path)) {
            return null;
        }

        String value = config.getString(path);
        return value == null ? null : value.trim();
    }
}
