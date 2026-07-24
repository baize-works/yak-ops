package org.apache.seatunnel.plugin.datasource.api.jdbc;

/**
 * Strategy interface for building SQL statements based on different
 * task execution types.
 *
 * <p>This interface encapsulates the logic of how SQL is generated
 * for different query scenarios (e.g. single table query, custom SQL,
 * multi-table query, etc.). Each implementation represents one
 * concrete execution strategy.</p>
 *
 * <p>The {@link AbstractJdbcCatalog} is responsible only for executing
 * SQL, while {@code QueryStrategy} focuses on <b>how SQL is constructed</b>.
 * This separation improves extensibility and avoids conditional logic
 * (such as switch-case) in the catalog layer.</p>
 */
public interface QueryStrategy {

    /**
     * Builds a SQL statement used to fetch a limited number of records
     * (e.g. top N rows) according to the specific execution strategy.
     *
     * <p>The returned SQL should already contain any database-specific
     * limiting logic (such as {@code LIMIT}, {@code ROWNUM}, or
     * {@code FETCH FIRST}).</p>
     *
     * @param catalog the JDBC catalog providing database-specific capabilities
     *                (such as limit syntax or SQL wrapping helpers)
     * @param request the query request containing execution context,
     *                table information, custom SQL, and limit configuration
     * @return a complete SQL string for retrieving the top records
     */
    String buildTopSql(AbstractJdbcCatalog catalog, QueryRequest request);

    /**
     * Builds a SQL statement used to count the total number of records
     * for the given execution strategy.
     *
     * <p>For simple table queries, this may be a direct
     * {@code SELECT COUNT(*) FROM table}. For complex or custom queries,
     * this typically wraps the original SQL as a subquery.</p>
     *
     * @param catalog the JDBC catalog providing database-specific SQL helpers
     * @param request the query request containing execution context
     *                and original query definition
     * @return a SQL string that returns a single count value
     */
    String buildCountSql(AbstractJdbcCatalog catalog, QueryRequest request);

    /**
     * Builds a SQL statement used to select the column data
     * for the given execution strategy.
     *
     * <p>For simple queries, this is typically a direct
     * {@code SELECT} statement with the requested columns.
     * For complex or customized queries, it may involve
     * column transformations, aggregations, or subqueries.</p>
     *
     * @param catalog the JDBC catalog providing database-specific SQL helpers
     * @param request the query request containing execution context
     *                and original query definition
     * @return a SQL string that returns the selected column results
     */
    String buildSelectColumnsSql(AbstractJdbcCatalog catalog, QueryRequest request);
}

