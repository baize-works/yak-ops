package io.yak.ops.spi.datasource;

import java.util.List;

/** 数据源 Catalog 元数据访问契约。 */
public interface DataSourceCatalog {

  List<String> listDatabases();

  List<String> listSchemas(String database);

  List<DataSourceTable> listTables(DataSourceCatalogQuery query);

  List<DataSourceColumn> listColumns(DataSourceTablePath tablePath);
}
