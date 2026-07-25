package io.yak.ops.infrastructure.verify.job;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import javax.annotation.Resource;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.HoconBuildContext;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.utils.DataSourceUtils;
import io.yak.ops.common.enums.HoconBuildStage;
import io.yak.ops.dao.entity.DataSource;
import io.yak.ops.dao.entity.LinkUpClient;
import io.yak.ops.plugin.spi.enums.DbType;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class JdbcConnectivityTestJobDefinitionBuilder implements ConnectivityTestJobDefinitionBuilder {

    private static final Set<DbType> SUPPORTED = new HashSet<>(Arrays.asList(
            DbType.MYSQL,
            DbType.POSTGRE_SQL,
            DbType.KINGBASE,
            DbType.DAMENG,
            DbType.ORACLE
    ));

    @Resource
    private ConnectivitySourceBuilderResolver sourceBuilderResolver;

    @Resource
    private ConnectivitySourcePluginNameResolver sourcePluginNameResolver;

    @Resource
    private ConsoleSinkHoconBuilder consoleSinkHoconBuilder;

    @Resource
    private TestJobEnvConfigBuilder testJobEnvConfigBuilder;

    @Resource
    private LinkUpJobConfigAssembler linkUpJobConfigAssembler;

    @Override
    public boolean supports(DbType dbType) {
        return SUPPORTED.contains(dbType);
    }

    @Override
    public ConnectivityTestJob build(LinkUpClient client, DataSource datasource) {
        DbType dbType = datasource.getDbType();

        String builderKey = sourceBuilderResolver.resolveBuilderKey(dbType);
        String hoconPluginName = sourcePluginNameResolver.resolvePluginName(dbType);

        DataSourceProcessor processor = DataSourceUtils.getDatasourceProcessor(dbType);
        DataSourceHoconBuilder sourceBuilder = processor.getQueryBuilder(builderKey);

        String connectivitySql = processor.connectivityCheckSql();
        Config sourceNodeConfig = buildMinimalSourceNodeConfig(connectivitySql);
        Config connectionConfig = ConfigFactory.parseString(datasource.getConnectionParams());
        HoconBuildContext buildContext = HoconBuildContext.builder()
                .connectionParam(datasource.getConnectionParams())
                .connectionConfig(connectionConfig)
                .nodeConfig(sourceNodeConfig)
                .stage(HoconBuildStage.INSTANCE)
                .build();
        Config sourcePluginConfig = sourceBuilder.buildSourceHocon(buildContext);

        String jobName = buildJobName(client.getId(), datasource.getId());
        String jobConfig = linkUpJobConfigAssembler.assemble(
                testJobEnvConfigBuilder.buildBatchEnv(),
                hoconPluginName,
                sourcePluginConfig,
                consoleSinkHoconBuilder.pluginName(),
                consoleSinkHoconBuilder.build()
        );

        return new ConnectivityTestJob(jobName, jobConfig, "hocon", true);
    }

    private Config buildMinimalSourceNodeConfig(String connectivitySql) {
        Map<String, Object> map = new LinkedHashMap<>(4);
        map.put("sql", connectivitySql);
        map.put("readMode", "sql");
        return ConfigFactory.parseMap(map);
    }

    private String buildJobName(Long clientId, Long datasourceId) {
        return "connectivity_check_" + datasourceId + "_" + clientId + "_" + System.currentTimeMillis();
    }
}
