package io.yak.ops.spi.datasource;

/** Catalog 表查询条件。 */
public final class DataSourceCatalogQuery {

  private final String database;
  private final String schema;
  private final String keyword;

  public DataSourceCatalogQuery(String database, String schema, String keyword) {
    this.database = database;
    this.schema = schema;
    this.keyword = keyword;
  }

  public String getDatabase() {
    return database;
  }

  public String getSchema() {
    return schema;
  }

  public String getKeyword() {
    return keyword;
  }
}
