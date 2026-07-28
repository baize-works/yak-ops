package io.yak.ops.plugin.database.jdbc.mysql;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.yak.ops.plugin.database.jdbc.GenericJdbcCatalog;
import io.yak.ops.plugin.database.jdbc.JdbcConnectionProperties;
import io.yak.ops.spi.datasource.DataSourceConnection;
import io.yak.ops.spi.datasource.DataSourcePlugin;
import io.yak.ops.spi.datasource.DataSourcePluginException;
import java.util.HashSet;
import java.util.Map;
import java.util.ServiceLoader;
import java.util.Set;
import org.junit.jupiter.api.Test;

class MySqlDataSourcePluginTest {

  @Test
  void shouldParseAndNormalizeConnectionParametersInsidePlugin() {
    DataSourceConnection connection =
        new MySqlDataSourcePlugin()
            .parseConnection(
                "{\"pluginType\":\"MYSQL\",\"host\":\"127.0.0.1\","
                    + "\"database\":\"demo\",\"username\":\"root\","
                    + "\"password\":\"secret\",\"properties\":{\"useSSL\":\"false\"}}");

    assertThat(connection.jdbcUrl()).isEqualTo("jdbc:mariadb://127.0.0.1:3306/demo");
    assertThat(connection.driverClassName()).isEqualTo("org.mariadb.jdbc.Driver");
    assertThat(connection.properties()).containsEntry("useSSL", "false");
    assertThat(connection.normalizedJson()).contains("\"dbType\":\"MYSQL\"");
  }

  @Test
  void shouldRejectMismatchedDeclaredPluginType() {
    assertThatThrownBy(
            () ->
                new MySqlDataSourcePlugin()
                    .parseConnection(
                        "{\"pluginType\":\"DORIS\",\"host\":\"127.0.0.1\","
                            + "\"database\":\"demo\",\"username\":\"root\"}"))
        .isInstanceOf(DataSourcePluginException.class)
        .hasMessageContaining("插件不匹配");
  }

  @Test
  void shouldResolveRequestAndBuiltInVariablesInsideCatalog() {
    JdbcConnectionProperties connection =
        (JdbcConnectionProperties)
            new MySqlDataSourcePlugin()
                .parseConnection(
                    "{\"host\":\"127.0.0.1\",\"database\":\"demo\","
                        + "\"username\":\"root\"}");
    GenericJdbcCatalog catalog = new GenericJdbcCatalog(connection, 5);

    String resolved =
        catalog.resolveSql(
            "select '${tenant}' as tenant, ${var:today_start} as start_time",
            Map.of(
                "paramsList",
                java.util.List.of(Map.of("paramName", "tenant", "paramValue", "north"))));

    assertThat(resolved).contains("north").doesNotContain("${var:today_start}");
  }

  @Test
  void shouldDiscoverJdbcPluginsThroughServiceLoader() {
    Set<String> types = new HashSet<>();
    for (DataSourcePlugin plugin : ServiceLoader.load(DataSourcePlugin.class)) {
      types.add(plugin.dbType().name());
    }

    assertThat(types)
        .contains("MYSQL", "POSTGRE_SQL", "ORACLE", "KINGBASE", "DAMENG");
  }
}
