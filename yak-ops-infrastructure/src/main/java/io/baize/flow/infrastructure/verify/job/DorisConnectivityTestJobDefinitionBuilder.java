package io.baize.flow.infrastructure.verify.job;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.HoconBuildContext;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcCatalog;
import org.apache.seatunnel.plugin.datasource.api.utils.DataSourceUtils;
import org.apache.seatunnel.plugin.datasource.doris.metadata.DorisCatalog;
import io.baize.flow.common.enums.HoconBuildStage;
import io.baize.flow.dao.entity.DataSource;
import io.baize.flow.dao.entity.SeaTunnelClient;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;
import io.baize.flow.plugin.spi.enums.DbType;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Doris 连通性测试任务构建器。
 *
 * <p>Doris 不走 JDBC select 1 的方式测试连通性，而是通过 Doris Source 插件
 * 读取一张表来验证连通性。使用分区字段（分区表）或第一个字段（非分区表）
 * 构建 doris.filter.query 过滤条件，确保 Doris Source 能有效扫描数据。</p>
 *
 * <p>表名和字段信息通过 DorisCatalog（JDBC queryPort 9030）获取。</p>
 */
@Slf4j
@Component
public class DorisConnectivityTestJobDefinitionBuilder implements ConnectivityTestJobDefinitionBuilder {

    @Resource
    private ConsoleSinkHoconBuilder consoleSinkHoconBuilder;

    @Resource
    private TestJobEnvConfigBuilder testJobEnvConfigBuilder;

    @Resource
    private SeaTunnelJobConfigAssembler seaTunnelJobConfigAssembler;

    @Override
    public boolean supports(DbType dbType) {
        return dbType == DbType.DORIS;
    }

    @Override
    public ConnectivityTestJob build(SeaTunnelClient client, DataSource datasource) {
        DbType dbType = datasource.getDbType();
        String connectionJson = datasource.getConnectionParams();

        // 通过 SPI 获取 Doris 处理器
        DataSourceProcessor processor = DataSourceUtils.getDatasourceProcessor(dbType);
        BaseConnectionParam param = processor.getParamConverter().createConnectionParams(connectionJson);

        // 通过 DorisCatalog（JDBC queryPort）获取表和过滤字段
        JdbcCatalog catalog = processor.getMetadataService(param);
        String tableName = queryFirstTable(catalog);
        String filterColumn = ((DorisCatalog) catalog).getFilterColumn(param.getDatabase(), tableName);

        // 构建 node 配置（database、table、doris.filter.query）
        Config sourceNodeConfig = buildConnectivitySourceNodeConfig(
                param.getDatabase(), tableName, filterColumn);

        // 使用 DorisBatchBuilder 构建 source HOCON
        DataSourceHoconBuilder sourceBuilder = processor.getQueryBuilder("DORIS");
        Config connectionConfig = ConfigFactory.parseString(connectionJson);
        HoconBuildContext buildContext = HoconBuildContext.builder()
                .connectionParam(connectionJson)
                .connectionConfig(connectionConfig)
                .nodeConfig(sourceNodeConfig)
                .stage(HoconBuildStage.INSTANCE)
                .build();
        Config sourcePluginConfig = sourceBuilder.buildSourceHocon(buildContext);

        // 组装完整 job 配置
        String jobName = buildJobName(client.getId(), datasource.getId());
        String jobConfig = seaTunnelJobConfigAssembler.assemble(
                testJobEnvConfigBuilder.buildBatchEnv(),
                "Doris",
                sourcePluginConfig,
                consoleSinkHoconBuilder.pluginName(),
                consoleSinkHoconBuilder.build()
        );

        return new ConnectivityTestJob(jobName, jobConfig, "hocon", true);
    }

    /**
     * 通过 JdbcCatalog.listTables() 获取第一张表名。
     */
    private String queryFirstTable(JdbcCatalog catalog) {
        List<String> tables = catalog.listTables();
        if (tables == null || tables.isEmpty()) {
            throw new IllegalStateException(
                    "Doris 数据库中没有找到任何表，无法执行连通性测试");
        }
        return tables.get(0);
    }

    /**
     * 构建连通性测试的 source node 配置。
     *
     * <p>包含 database、table 和 doris.filter.query。
     * doris.filter.query 使用分区字段（分区表）或第一个字段（非分区表）
     * 构建 IS NOT NULL 过滤条件，确保 Doris Source 能有效扫描数据。</p>
     */
    private Config buildConnectivitySourceNodeConfig(
            String database, String tableName, String filterColumn) {
        String filterQuery = "`" + filterColumn + "` IS NULL";
        log.info("Doris 连通性测试: table={}.{}, filterColumn={}, filterQuery={}",
                database, tableName, filterColumn, filterQuery);

        Map<String, Object> map = new LinkedHashMap<>(4);
        map.put("database", database);
        map.put("table", tableName);
        map.put("doris.filter.query", filterQuery);
        return ConfigFactory.parseMap(map);
    }

    private String buildJobName(Long clientId, Long datasourceId) {
        return "connectivity_check_" + datasourceId + "_" + clientId + "_" + System.currentTimeMillis();
    }
}
