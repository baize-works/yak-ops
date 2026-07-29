package io.yak.ops.business.datasource.service.impl;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import io.yak.ops.business.datasource.config.DataSourceProperties;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.business.datasource.exception.DataSourceException;
import io.yak.ops.business.datasource.plugin.DataSourcePluginRegistry;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DataSourceCatalogServiceImplTest {

  private final DataSourceDao dataSourceDao = mock(DataSourceDao.class);
  private final DataSourcePluginRegistry pluginRegistry = mock(DataSourcePluginRegistry.class);
  private final DataSourceProperties properties = mock(DataSourceProperties.class);
  private final DataSourceCatalogServiceImpl service =
      new DataSourceCatalogServiceImpl(dataSourceDao, pluginRegistry, properties);

  @Test
  void shouldRejectNonSelectSqlBeforeOpeningDatasourceConnection() {
    assertThatThrownBy(
            () ->
                service.preview(
                    1L,
                    Map.of(
                        "read_mode", "sql",
                        "query", "DELETE FROM patient")))
        .isInstanceOf(DataSourceException.class)
        .hasMessageContaining("仅允许执行单条 SELECT 查询");

    verifyNoInteractions(dataSourceDao, pluginRegistry, properties);
  }

  @Test
  void shouldRejectMultipleStatements() {
    assertThatThrownBy(
            () ->
                service.count(
                    1L,
                    Map.of(
                        "read_mode", "sql",
                        "query", "SELECT * FROM patient; DROP TABLE patient")))
        .isInstanceOf(DataSourceException.class)
        .hasMessageContaining("仅允许执行单条 SELECT 查询");
  }
}
