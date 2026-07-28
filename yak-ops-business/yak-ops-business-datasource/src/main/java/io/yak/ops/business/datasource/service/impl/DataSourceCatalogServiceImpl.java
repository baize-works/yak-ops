package io.yak.ops.business.datasource.service.impl;

import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.config.DataSourceProperties;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.business.datasource.exception.DataSourceException;
import io.yak.ops.business.datasource.plugin.DataSourcePluginRegistry;
import io.yak.ops.business.datasource.service.DataSourceCatalogService;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogColumnVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogTableVO;
import io.yak.ops.common.enums.datasource.DataSourceErrorCode;
import io.yak.ops.spi.datasource.DataSourceCatalog;
import io.yak.ops.spi.datasource.DataSourceCatalogQuery;
import io.yak.ops.spi.datasource.DataSourceConnection;
import io.yak.ops.spi.datasource.DataSourcePlugin;
import io.yak.ops.spi.datasource.DataSourcePluginException;
import io.yak.ops.spi.datasource.DataSourceTablePath;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Catalog 元数据服务实现，数据库差异全部由插件处理。 */
@Service
@ConditionalOnDataSourceEnabled
@RequiredArgsConstructor
public class DataSourceCatalogServiceImpl implements DataSourceCatalogService {

  private final DataSourceDao dataSourceDao;
  private final DataSourcePluginRegistry pluginRegistry;
  private final DataSourceProperties properties;

  @Override
  public List<String> listDatabases(Long dataSourceId) {
    return execute(dataSourceId, DataSourceCatalog::listDatabases);
  }

  @Override
  public List<String> listSchemas(Long dataSourceId, String database) {
    return execute(dataSourceId, catalog -> catalog.listSchemas(database));
  }

  @Override
  public List<DataSourceCatalogTableVO> listTables(
      Long dataSourceId,
      String database,
      String schema,
      String keyword) {
    return execute(
        dataSourceId,
        catalog ->
            catalog.listTables(new DataSourceCatalogQuery(database, schema, keyword)).stream()
                .map(
                    table ->
                        new DataSourceCatalogTableVO(
                            table.getDatabase(),
                            table.getSchema(),
                            table.getName(),
                            table.getType(),
                            table.getRemarks()))
                .collect(Collectors.toList()));
  }

  @Override
  public List<DataSourceCatalogColumnVO> listColumns(
      Long dataSourceId,
      String database,
      String schema,
      String table) {
    return execute(
        dataSourceId,
        catalog ->
            catalog.listColumns(new DataSourceTablePath(database, schema, table)).stream()
                .map(
                    column ->
                        new DataSourceCatalogColumnVO(
                            column.getName(),
                            column.getTypeName(),
                            column.getJdbcType(),
                            column.getSize(),
                            column.getScale(),
                            column.isNullable(),
                            column.getOrdinalPosition(),
                            column.isPrimaryKey(),
                            column.getRemarks()))
                .collect(Collectors.toList()));
  }

  private <T> T execute(Long dataSourceId, Function<DataSourceCatalog, T> action) {
    try {
      DataSourcePO dataSourcePO = getDataSourceOrThrow(dataSourceId);
      DataSourcePlugin plugin = pluginRegistry.get(dataSourcePO.getDbType());
      DataSourceConnection connection = plugin.parseConnection(dataSourcePO.getConnectionParams());
      DataSourceCatalog catalog =
          plugin.createCatalog(
              connection,
              Math.max(1, properties.getConnectionTest().getTimeoutSeconds()));
      return action.apply(catalog);
    } catch (DataSourceException exception) {
      throw exception;
    } catch (DataSourcePluginException exception) {
      throw new DataSourceException(
          DataSourceErrorCode.CATALOG_FAILED,
          exception.getMessage(),
          exception);
    } catch (RuntimeException exception) {
      throw new DataSourceException(
          DataSourceErrorCode.CATALOG_FAILED,
          exception.getMessage(),
          exception);
    }
  }

  private DataSourcePO getDataSourceOrThrow(Long id) {
    if (id == null || id <= 0) {
      throw new DataSourceException(DataSourceErrorCode.NOT_FOUND);
    }
    DataSourcePO dataSourcePO = dataSourceDao.selectById(id);
    if (dataSourcePO == null) {
      throw new DataSourceException(DataSourceErrorCode.NOT_FOUND);
    }
    return dataSourcePO;
  }
}
