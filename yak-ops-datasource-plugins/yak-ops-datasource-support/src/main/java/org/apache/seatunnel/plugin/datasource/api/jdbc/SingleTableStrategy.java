package org.apache.seatunnel.plugin.datasource.api.jdbc;

import org.apache.commons.lang3.StringUtils;

public class SingleTableStrategy implements QueryStrategy {

    @Override
    public String buildTopSql(AbstractJdbcCatalog catalog, QueryRequest request) {
        TablePath tablePath = request.getTablePath();
        if (tablePath == null || StringUtils.isBlank(tablePath.getTableName())) {
            throw new IllegalArgumentException("table is null");
        }

        String baseSql = "SELECT * FROM " + catalog.buildTableReference(tablePath);
        return catalog.applyLimit(baseSql, request.getLimit());
    }

    @Override
    public String buildCountSql(AbstractJdbcCatalog catalog, QueryRequest request) {
        TablePath tablePath = request.getTablePath();
        if (tablePath == null || StringUtils.isBlank(tablePath.getTableName())) {
            throw new IllegalArgumentException("table is null");
        }

        return catalog.buildCountQuery(tablePath.getTableName());
    }

    @Override
    public String buildSelectColumnsSql(AbstractJdbcCatalog catalog, QueryRequest request) {
        TablePath tablePath = request.getTablePath();
        if (tablePath == null || StringUtils.isBlank(tablePath.getTableName())) {
            throw new IllegalArgumentException("table is null");
        }

        return catalog.getSelectColumnsSql(tablePath);
    }
}