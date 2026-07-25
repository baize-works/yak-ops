package io.yak.ops.application.service;

import io.yak.ops.common.QueryResult;
import io.yak.ops.web.contract.vo.ColumnOptionVO;
import io.yak.ops.web.contract.vo.OptionVO;

import java.util.List;
import java.util.Map;

public interface DataSourceCatalogService {

    /**
     * Returns the list of tables (or equivalent objects) available in the
     * data source identified by the given ID.
     *
     * @param id data-source primary key registered in the system
     * @return list of table descriptors, never {@code null}
     * @throws RuntimeException if the data source is unreachable or the query fails
     */
    List<OptionVO> listTable(Long id);

    /**
     * Retrieves a list of table references from a datasource, with optional filtering based on match mode.
     *
     * @param datasourceId the ID of the datasource from which to list tables
     * @param matchMode    the filtering mode:
     *                     "2" - treat `keyword` as a regex pattern and match table names against it
     *                     "3" - treat `keyword` as a comma-separated list of exact table names to match
     * @param keyword      the filtering keyword, whose meaning depends on the matchMode; can be null or empty for no filtering
     * @return a list of OptionVO objects representing the tables, filtered according to the matchMode and keyword
     */
    List<OptionVO> listTableReference(Long datasourceId, String matchMode, String keyword);

    /**
     * Retrieves the column metadata for the specified table.
     *
     * @param id          data-source primary key registered in the system
     * @param requestBody additional parameters such as schema, table, column filter,
     *                    row filter, or custom SQL fragment; structure is
     *                    implementation-specific
     * @return list of column descriptors, never {@code null}
     * @throws RuntimeException if the table does not exist or the query fails
     */
    List<ColumnOptionVO> listColumn(Long id, Map<String, Object> requestBody);

    /**
     * Samples the first 20 rows of the requested table or view.
     * The result is returned in a generic container that can be serialized
     * to JSON and rendered in the admin UI without leaking JDBC-specific types.
     *
     * @param datasourceId primary key of the data source
     * @param requestBody  additional parameters such as schema, table, column filter,
     *                     row filter, or custom SQL fragment; structure is
     *                     implementation-specific
     * @return paginated result containing at most 20 rows and optional column metadata
     * @throws RuntimeException if the query fails or the requested object is inaccessible
     */
    QueryResult getTop20Data(Long datasourceId, Map<String, Object> requestBody);

    /**
     * Count total number of rows from the specified table or query.
     *
     * @param datasourceId primary key of the data source
     * @param requestBody  requestBody query conditions including table name and optional filters
     * @return total count of rows matching the given conditions
     */
    Integer count(Long datasourceId, Map<String, Object> requestBody);

    /**
     * Build select sql template from datasource and table path.
     */
    String buildSqlTemplate(Long datasourceId, Map<String, Object> requestBody);

    /**
     * Resolve sql variables like ${var:today_start}.
     */
    String resolveSql(Long datasourceId, Map<String, Object> requestBody);
}
