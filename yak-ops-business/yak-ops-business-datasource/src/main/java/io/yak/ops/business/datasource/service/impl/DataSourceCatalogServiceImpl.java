package io.yak.ops.business.datasource.service.impl;

import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.config.DataSourceProperties;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.business.datasource.exception.DataSourceException;
import io.yak.ops.business.datasource.plugin.DataSourcePluginRegistry;
import io.yak.ops.business.datasource.service.DataSourceCatalogService;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogColumnOptionVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogColumnVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogOptionVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogTableVO;
import io.yak.ops.common.bean.vo.datasource.DataSourcePreviewColumnVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceQueryResultVO;
import io.yak.ops.common.enums.datasource.DataSourceErrorCode;
import io.yak.ops.spi.datasource.DataSourceCatalog;
import io.yak.ops.spi.datasource.DataSourceConnection;
import io.yak.ops.spi.datasource.DataSourcePlugin;
import io.yak.ops.spi.datasource.DataSourcePluginException;
import io.yak.ops.spi.datasource.catalog.DataSourceCatalogQuery;
import io.yak.ops.spi.datasource.catalog.DataSourceTablePath;
import io.yak.ops.spi.datasource.query.DataSourceQueryResult;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Catalog 服务实现，业务层只负责数据源加载、插件路由和响应模型转换。 */
@Service
@ConditionalOnDataSourceEnabled
@RequiredArgsConstructor
public class DataSourceCatalogServiceImpl implements DataSourceCatalogService {

  private static final int PREVIEW_LIMIT = 20;

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

  @Override
  public List<DataSourceCatalogOptionVO> listTable(Long dataSourceId) {
    return execute(
        dataSourceId,
        catalog ->
            catalog.listTables(new DataSourceCatalogQuery(null, null, null)).stream()
                .map(
                    table -> {
                      String label =
                          isBlank(table.getRemarks()) ? table.getName() : table.getRemarks();
                      return new DataSourceCatalogOptionVO(
                          table.getName(),
                          label,
                          table.getRemarks());
                    })
                .collect(Collectors.toList()));
  }

  @Override
  public List<DataSourceCatalogOptionVO> listTableReference(
      Long dataSourceId,
      String matchMode,
      String keyword) {
    List<DataSourceCatalogOptionVO> options = listTable(dataSourceId);
    if (isBlank(keyword)) {
      return options;
    }

    if ("2".equals(matchMode)) {
      try {
        Pattern pattern = Pattern.compile(keyword);
        return options.stream()
            .filter(option -> pattern.matcher(String.valueOf(option.getValue())).matches())
            .collect(Collectors.toList());
      } catch (PatternSyntaxException exception) {
        throw new DataSourceException(
            DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
            "表名正则表达式不合法：" + exception.getDescription(),
            exception);
      }
    }

    if ("3".equals(matchMode)) {
      Set<String> exactNames =
          Arrays.stream(keyword.split(","))
              .map(String::trim)
              .filter(name -> !name.isEmpty())
              .collect(Collectors.toSet());
      return options.stream()
          .filter(option -> exactNames.contains(String.valueOf(option.getValue())))
          .collect(Collectors.toList());
    }

    return options;
  }

  @Override
  public List<DataSourceCatalogColumnOptionVO> listColumn(
      Long dataSourceId,
      Map<String, Object> requestBody) {
    return execute(
        dataSourceId,
        catalog ->
            catalog.describe(requireRequest(requestBody)).stream()
                .map(
                    column ->
                        new DataSourceCatalogColumnOptionVO(
                            column.getOrdinalPosition(),
                            column.getName(),
                            column.getTypeName(),
                            column.getOrdinalPosition(),
                            column.isNullable() ? "YES" : "NO",
                            column.getRemarks(),
                            column.isPrimaryKey() ? "PRI" : ""))
                .collect(Collectors.toList()));
  }

  @Override
  public DataSourceQueryResultVO preview(
      Long dataSourceId,
      Map<String, Object> requestBody) {
    return execute(
        dataSourceId,
        catalog -> toPreviewVO(catalog.preview(requireRequest(requestBody), PREVIEW_LIMIT)));
  }

  @Override
  public Long count(Long dataSourceId, Map<String, Object> requestBody) {
    return execute(dataSourceId, catalog -> catalog.count(requireRequest(requestBody)));
  }

  @Override
  public String buildSqlTemplate(Long dataSourceId, Map<String, Object> requestBody) {
    String tablePath = requiredText(requireRequest(requestBody), "table_path", "tablePath", "table");
    return execute(dataSourceId, catalog -> catalog.buildSqlTemplate(tablePath));
  }

  @Override
  public String resolveSql(Long dataSourceId, Map<String, Object> requestBody) {
    Map<String, Object> request = requireRequest(requestBody);
    String query = requiredText(request, "query", "sql");
    return execute(dataSourceId, catalog -> catalog.resolveSql(query, request));
  }

  private DataSourceQueryResultVO toPreviewVO(DataSourceQueryResult result) {
    List<DataSourcePreviewColumnVO> columns =
        result.getColumns().stream()
            .map(
                column ->
                    new DataSourcePreviewColumnVO(
                        column.getTitle(),
                        column.getDataIndex(),
                        column.getKey(),
                        column.isEllipsis()))
            .collect(Collectors.toList());
    return new DataSourceQueryResultVO(columns, result.getData(), result.getTotal());
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

  private Map<String, Object> requireRequest(Map<String, Object> requestBody) {
    if (requestBody == null || requestBody.isEmpty()) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
          "requestBody 不能为空");
    }
    return requestBody;
  }

  private String requiredText(Map<String, Object> request, String... keys) {
    for (String key : keys) {
      Object value = request.get(key);
      if (value != null && !String.valueOf(value).trim().isEmpty()) {
        return String.valueOf(value).trim();
      }
    }
    throw new DataSourceException(
        DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
        keys[0] + " 不能为空");
  }

  private boolean isBlank(String value) {
    return value == null || value.trim().isEmpty();
  }
}
