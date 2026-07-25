package org.apache.seatunnel.plugin.datasource.api.jdbc;

import io.baize.flow.common.QueryResult;
import org.apache.seatunnel.plugin.datasource.api.modal.DataSourceTableColumn;
import org.apache.seatunnel.plugin.datasource.api.model.DatasourceOption;

import java.util.List;
import java.util.Map;

/**
 * Service for reading database metadata.
 */
public interface JdbcCatalog {

    /**
     * List all accessible tables.
     *
     * @return table name list
     */
    List<String> listTables();

    /**
     * List all accessible tables.
     *
     * @return table name list
     */
    List<DatasourceOption> listTableOptions();

    /**
     * List columns of the specified table.
     *
     * @param requestBody additional parameters such as schema, table, column filter,
     *                    row filter, or custom SQL fragment; structure is
     *                    implementation-specific
     * @return column metadata list
     */
    List<DataSourceTableColumn> listColumns(Map<String, Object> requestBody) throws Exception;

    /**
     * Fetch top 20 rows from the specified table or query.
     *
     * @param requestBody query conditions (table, filters, etc.)
     * @return query result with data and metadata
     */
    QueryResult getTop20Data(Map<String, Object> requestBody) throws Exception;

    /**
     * Count total number of rows from the specified table or query.
     *
     * @param requestBody requestBody query conditions including table name and optional filters
     * @return total count of rows matching the given conditions
     */
    Integer count(Map<String, Object> requestBody) throws Exception;

    /**
     * Build SELECT all columns sql for the specified table path.
     */
    String buildSelectAllColumnsSql(String tablePath, List<DataSourceTableColumn> columns);

    /**
     * Build SELECT all columns sql for the specified table path.
     */
    String buildSelectAllColumnsSql(TablePath tablePath, List<DataSourceTableColumn> columns);

    /**
     * Resolve variables inside sql, such as ${var:today_start}.
     */
    String resolveSqlVariables(String sql);

}
