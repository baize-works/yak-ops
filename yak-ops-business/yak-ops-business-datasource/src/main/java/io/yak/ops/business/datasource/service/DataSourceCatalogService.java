package io.yak.ops.business.datasource.service;

import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogColumnOptionVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogColumnVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogOptionVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogTableVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceQueryResultVO;
import java.util.List;
import java.util.Map;

/** 数据源 Catalog 元数据和预览服务。 */
public interface DataSourceCatalogService {

  List<String> listDatabases(Long dataSourceId);

  List<String> listSchemas(Long dataSourceId, String database);

  List<DataSourceCatalogTableVO> listTables(
      Long dataSourceId,
      String database,
      String schema,
      String keyword);

  List<DataSourceCatalogColumnVO> listColumns(
      Long dataSourceId,
      String database,
      String schema,
      String table);

  List<DataSourceCatalogOptionVO> listTable(Long dataSourceId);

  List<DataSourceCatalogOptionVO> listTableReference(
      Long dataSourceId,
      String matchMode,
      String keyword);

  List<DataSourceCatalogColumnOptionVO> listColumn(
      Long dataSourceId,
      Map<String, Object> requestBody);

  DataSourceQueryResultVO preview(
      Long dataSourceId,
      Map<String, Object> requestBody);

  Long count(Long dataSourceId, Map<String, Object> requestBody);

  String buildSqlTemplate(Long dataSourceId, Map<String, Object> requestBody);

  String resolveSql(Long dataSourceId, Map<String, Object> requestBody);
}
