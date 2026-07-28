package io.yak.ops.business.datasource.service;

import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogColumnVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogTableVO;
import java.util.List;

/** 数据源 Catalog 元数据服务。 */
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
}
