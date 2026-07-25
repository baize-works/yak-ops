package io.baize.flow.application.support.builder.sink;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import jakarta.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.HoconBuildContext;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.utils.DataSourceUtils;
import io.baize.flow.common.config.ConfigValidator;
import io.baize.flow.common.config.ReadonlyConfig;
import io.baize.flow.common.enums.HoconBuildStage;
import io.baize.flow.application.support.builder.context.DagBuildContext;
import io.baize.flow.dao.entity.DataSource;
import io.baize.flow.dao.repository.DataSourceDao;
import io.baize.flow.plugin.spi.enums.DbType;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * DataSource sink node builder.
 *
 * <p>
 * Although the current main implementation is JDBC Sink,
 * this builder is designed to support other sink plugin types later,
 * such as Kafka, File, Hive, StarRocks, Doris, etc.
 * </p>
 */
@Component
public class DataSourceSinkBuilder implements SinkNodeConfigBuilder {

    private static final String NODE_TYPE = "sink";

    private static final String KEY_DATA_SOURCE_ID = "dataSourceId";
    private static final String KEY_DB_TYPE = "dbType";
    private static final String KEY_PLUGIN_NAME = "pluginName";
    private static final String KEY_CONNECTOR_TYPE = "connectorType";

    @Resource
    private DataSourceDao dataSourceDao;

    @Override
    public String nodeType() {
        return NODE_TYPE;
    }

    @Override
    public Config build(Config data) {
        return build(data, DagBuildContext.empty());
    }

    @Override
    public Config build(Config data, DagBuildContext context) {
        Config config = resolveNodeConfig(data);
        config = appendPluginInputIfNecessary(data, config, context);

        Long dataSourceId = parseDataSourceId(config);
        DataSource dataSource = getRequiredDataSource(dataSourceId);

        DbType dbType = parseDbType(data);
        String pluginName = getRequiredPluginName(data);

        DataSourceProcessor processor = DataSourceUtils.getDatasourceProcessor(dbType);
        DataSourceHoconBuilder hoconBuilder = processor.getQueryBuilder(pluginName);

        if (!hoconBuilder.supportsSink()) {
            throw new IllegalArgumentException(pluginName + " does not support sink side");
        }

        HoconBuildContext buildContext = buildHoconContext(
                dataSource,
                config,
                context
        );

        Config sinkConfig = hoconBuilder.buildSinkHocon(buildContext);

        validateSinkConfig(processor, pluginName, sinkConfig);

        return sinkConfig;
    }

    private HoconBuildContext buildHoconContext(DataSource dataSource,
                                                Config nodeConfig,
                                                DagBuildContext dagContext) {
        String connectionParam = dataSource.getConnectionParams();
        Config connectionConfig = ConfigFactory.parseString(connectionParam);

        return HoconBuildContext.builder()
                .connectionParam(connectionParam)
                .connectionConfig(connectionConfig)
                .nodeConfig(nodeConfig)
                .scheduleConfig(dagContext == null ? null : dagContext.getScheduleConfig())
                .stage(HoconBuildStage.INSTANCE)
                .build();
    }

    private Config appendPluginInputIfNecessary(Config data,
                                                Config config,
                                                DagBuildContext context) {
        if (context == null || !context.hasTransform()) {
            return config;
        }

        String pluginInput = getTrimmedString(config, "pluginInput");
        if (StringUtils.isBlank(pluginInput)) {
            pluginInput = getTrimmedString(data, "pluginInput");
        }

        if (StringUtils.isBlank(pluginInput)) {
            return config;
        }

        Map<String, Object> extra = new HashMap<String, Object>();
        extra.put("plugin_input", pluginInput);

        return ConfigFactory.parseMap(extra)
                .withFallback(config)
                .resolve();
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
                    "Missing required field '" + KEY_DATA_SOURCE_ID + "' in sink node config");
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
                    "Sink data source does not exist, dataSourceId=" + dataSourceId);
        }
        return dataSource;
    }

    private DbType parseDbType(Config config) {
        String dbTypeValue = getTrimmedString(config, KEY_DB_TYPE);
        if (StringUtils.isBlank(dbTypeValue)) {
            throw new IllegalArgumentException(
                    "Missing required field '" + KEY_DB_TYPE + "' in sink node config");
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
                    "Missing required field '" + KEY_PLUGIN_NAME + "' in sink node config");
        }
        return pluginName.toUpperCase();
    }

    private void validateSinkConfig(DataSourceProcessor processor,
                                    String pluginName,
                                    Config sinkConfig) {
        ConfigValidator.of(ReadonlyConfig.fromConfig(sinkConfig))
                .validate(processor.sinkOptionRule());
    }

    private String getTrimmedString(Config config, String path) {
        if (config == null || !config.hasPath(path)) {
            return null;
        }

        String value = config.getString(path);
        return value == null ? null : value.trim();
    }
}