package org.apache.seatunnel.plugin.datasource.api.hocon;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import org.apache.seatunnel.plugin.datasource.api.hocon.table.*;
import org.apache.seatunnel.plugin.datasource.api.jdbc.AbstractJdbcHoconBuilder;

import java.util.HashMap;
import java.util.Map;

public abstract class AbstractJdbcBatchBuilder extends AbstractJdbcHoconBuilder
        implements DataSourceHoconBuilder {

    private final JdbcSourceTargetRouter sourceTargetRouter;
    private final JdbcSinkTargetRouter sinkTargetRouter;
    private final JdbcSourceOptionAppender sourceOptionAppender;
    private final JdbcSinkOptionAppender sinkOptionAppender;
    private final JdbcExtraOptionAppender extraOptionAppender;

    protected AbstractJdbcBatchBuilder() {
        JdbcTableNameResolver tableNameResolver = new JdbcTableNameResolver();

        JdbcSourceTargetBuilder singleSourceBuilder =
                new JdbcSingleSourceTargetBuilder(
                        tableNameResolver,
                        this::handleQuery
                );

        JdbcSourceTargetBuilder multiSourceBuilder =
                new JdbcMultiSourceTargetBuilder(tableNameResolver);

        JdbcSinkTargetBuilder singleSinkBuilder =
                new JdbcSingleSinkTargetBuilder(tableNameResolver);

        JdbcSinkTargetBuilder multiSinkBuilder =
                new JdbcMultiSinkTargetBuilder();

        this.sourceTargetRouter =
                new JdbcSourceTargetRouter(
                        tableNameResolver,
                        singleSourceBuilder,
                        multiSourceBuilder
                );

        this.sinkTargetRouter =
                new JdbcSinkTargetRouter(
                        tableNameResolver,
                        singleSinkBuilder,
                        multiSinkBuilder
                );

        this.sourceOptionAppender = new JdbcSourceOptionAppender();
        this.sinkOptionAppender = new JdbcSinkOptionAppender();
        this.extraOptionAppender = new JdbcExtraOptionAppender();
    }

    protected String handleQuery(String query, io.baize.flow.common.modal.JdbcQueryRenderContext context) {
        return query;
    }

    @Override
    public Config buildSourceHocon(HoconBuildContext context) {
        Config conn = context.getConnectionConfig();
        Config config = context.getNodeConfig();

        Map<String, Object> map = new HashMap<>(32);

        putConnCommon(conn, map);

        sourceTargetRouter.build(
                config,
                conn,
                map,
                context.getStage()
        );

        sourceOptionAppender.append(config, map);
        extraOptionAppender.append(config, map);

        return ConfigFactory.parseMap(map);
    }

    @Override
    public Config buildSinkHocon(HoconBuildContext context) {
        Config conn = context.getConnectionConfig();
        Config config = context.getNodeConfig();

        Map<String, Object> map = new HashMap<>(32);

        putConnCommon(conn, map);

        sinkTargetRouter.build(config, conn, map);
        sinkOptionAppender.append(config, map);
        extraOptionAppender.append(config, map);

        return ConfigFactory.parseMap(map);
    }

    @Override
    public String sourceTemplate() {
        return ""
                + "  Jdbc {\n"
                + "    datasourceId = @\n"
                + "    database = \"demo\"\n"
                + "    table_path = \"user\"\n"
                + "  }\n";
    }

    @Override
    public String sinkTemplate() {
        return ""
                + "  Jdbc {\n"
                + "    datasourceId = @\n"
                + "    table = \"demo.user_sink\"\n"
                + "    generate_sink_sql = true\n"
                + "    schema_save_mode = \"CREATE_SCHEMA_WHEN_NOT_EXIST\"\n"
                + "    data_save_mode = \"APPEND_DATA\"\n"
                + "    batch_size = 1000\n"
                + "  }\n";
    }
}