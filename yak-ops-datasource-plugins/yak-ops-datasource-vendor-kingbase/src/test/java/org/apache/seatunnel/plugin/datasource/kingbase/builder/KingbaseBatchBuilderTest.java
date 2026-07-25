package org.apache.seatunnel.plugin.datasource.kingbase.builder;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import org.apache.seatunnel.plugin.datasource.api.hocon.HoconBuildContext;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class KingbaseBatchBuilderTest {

    private final KingbaseBatchBuilder builder = new KingbaseBatchBuilder();

    @Test
    void sinkHoconAddsPostgresDialectByDefault() {
        Config config = builder.buildSinkHocon(context("targetTableName = sys_user\nautoCreateTable = true"));

        assertEquals("Postgres", config.getString("dialect"));
        assertEquals("test", config.getString("database"));
        assertEquals("public.sys_user", config.getString("table"));
        assertTrue(config.getBoolean("generate_sink_sql"));
        assertEquals("CREATE_SCHEMA_WHEN_NOT_EXIST", config.getString("schema_save_mode"));
    }

    @Test
    void sinkHoconKeepsExplicitDialectFromExtraParams() {
        Config config =
                builder.buildSinkHocon(
                        context(
                                "targetTableName = sys_user\n"
                                        + "autoCreateTable = true\n"
                                        + "extraParams = [{ key = \"dialect\", value = \"KingBase\" }]"));

        assertEquals("KingBase", config.getString("dialect"));
    }

    private HoconBuildContext context(String nodeConfig) {
        return HoconBuildContext.builder()
                .connectionConfig(
                        ConfigFactory.parseString(
                                "url = \"jdbc:kingbase8://localhost:54321/test\"\n"
                                        + "driver = \"com.kingbase8.Driver\"\n"
                                        + "user = test\n"
                                        + "password = test\n"
                                        + "database = test\n"
                                        + "schemaName = public"))
                .nodeConfig(ConfigFactory.parseString(nodeConfig))
                .build();
    }
}
