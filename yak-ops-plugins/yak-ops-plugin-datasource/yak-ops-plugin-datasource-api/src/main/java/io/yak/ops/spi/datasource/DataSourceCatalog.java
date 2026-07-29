package io.yak.ops.spi.datasource;

import io.yak.ops.spi.datasource.catalog.DataSourceCatalogQuery;
import io.yak.ops.spi.datasource.catalog.DataSourceTablePath;
import io.yak.ops.spi.datasource.metadata.DataSourceColumn;
import io.yak.ops.spi.datasource.metadata.DataSourceTable;
import io.yak.ops.spi.datasource.query.DataSourceQueryResult;
import java.util.List;
import java.util.Map;

/** 数据源 Catalog 元数据和轻量查询能力契约。 */
public interface DataSourceCatalog {

  List<String> listDatabases();

  List<String> listSchemas(String database);

  List<DataSourceTable> listTables(DataSourceCatalogQuery query);

  List<DataSourceColumn> listColumns(DataSourceTablePath tablePath);

  /** 根据表模式或 SQL 模式请求解析字段。 */
  List<DataSourceColumn> describe(Map<String, Object> request);

  /** 查询预览数据，插件必须限制最大返回行数。 */
  DataSourceQueryResult preview(Map<String, Object> request, int limit);

  /** 统计表或 SQL 查询结果行数。 */
  long count(Map<String, Object> request);

  /** 根据表字段构建 SELECT 模板。 */
  String buildSqlTemplate(String tablePath);

  /** 解析插件支持的 SQL 变量和调用方参数。 */
  String resolveSql(String sql, Map<String, Object> request);
}
