package org.apache.seatunnel.plugin.datasource.api.jdbc;

import org.apache.seatunnel.plugin.datasource.api.utils.SqlValidator;

/**
 * Implementation of QueryStrategy that builds SQL queries based on a custom input query.
 *
 * <p>
 * This strategy delegates the actual SQL manipulation to an AbstractJdbcCatalog instance,
 * applying limits, count wrapping, or column parsing to the original query.
 * </p>
 */
public class CustomQueryStrategy implements QueryStrategy {

    /**
     * Build a SQL query that returns the top N rows.
     *
     * @param catalog the JDBC catalog that provides database-specific SQL handling
     * @param request the query request containing the base query and limit
     * @return SQL string that retrieves the top N rows
     */
    @Override
    public String buildTopSql(AbstractJdbcCatalog catalog, QueryRequest request) {
        SqlValidator.validateSelectQuery(request.getQuery());
        // Apply database-specific limit using the catalog
        return catalog.applyLimit(request.getQuery(), request.getLimit());
    }

    /**
     * Build a SQL query that counts the total number of rows for the original query.
     *
     * @param catalog the JDBC catalog that provides database-specific SQL handling
     * @param request the query request containing the base query
     * @return SQL string that counts rows
     */
    @Override
    public String buildCountSql(AbstractJdbcCatalog catalog, QueryRequest request) {
        SqlValidator.validateSelectQuery(request.getQuery());
        // Wrap the original query in a COUNT(*) statement
        return catalog.wrapCountQuery(request.getQuery());
    }

    /**
     * Build a SQL query that selects the columns from the original query.
     *
     * @param catalog the JDBC catalog that provides database-specific SQL handling
     * @param request the query request containing the base query
     * @return SQL string that selects the columns
     */
    @Override
    public String buildSelectColumnsSql(AbstractJdbcCatalog catalog, QueryRequest request) {
        SqlValidator.validateSelectQuery(request.getQuery());
        // Parse and return the column selection part of the query
        return catalog.parseQueryColumnSql(request.getQuery());
    }
}
