package org.apache.seatunnel.plugin.datasource.mysql.metadata;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.jdbc.AbstractJdbcCatalog;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConnectionProvider;
import org.apache.seatunnel.plugin.datasource.api.jdbc.TablePath;
import org.apache.seatunnel.plugin.datasource.api.modal.DataSourceTableColumn;
import io.baize.flow.web.contract.vo.OptionVO;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
public class MySQLCatalog extends AbstractJdbcCatalog {

    private static final String SELECT_COLUMNS_SQL_TEMPLATE =
            "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '%s' AND TABLE_NAME ='%s' ORDER BY ORDINAL_POSITION ASC";

    private static final String SELECT_SPECIFIED_COLUMNS_SQL_TEMPLATE =
            "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '%s' AND TABLE_NAME = '%s' AND COLUMN_NAME IN (%s) ORDER BY ORDINAL_POSITION ASC";

    public MySQLCatalog(BaseConnectionParam param, JdbcConnectionProvider connectionManager) {
        super(param, connectionManager);
    }

    @Override
    protected String applyLimit(String sql, int limit) {
        return sql + " LIMIT " + limit;
    }

    @Override
    protected String getTableName(ResultSet rs) throws SQLException {
        return rs.getString("TABLE_NAME");
    }

    @Override
    public String buildTableReference(TablePath tablePath) {
        if (tablePath == null || StringUtils.isBlank(tablePath.getTableName())) {
            throw new IllegalArgumentException("table is null");
        }

        String databaseName = tablePath.getDatabaseName();

        if (StringUtils.isBlank(databaseName)) {
            databaseName = getParam().getDatabase();
        }

        String tableName = tablePath.getTableName();

        if (StringUtils.isBlank(databaseName)) {
            return quoteIdentifier(tableName);
        }

        return quoteIdentifier(databaseName) + "." + quoteIdentifier(tableName);
    }

    @Override
    protected TablePath resolveTablePath(String tablePath) {
        if (StringUtils.isBlank(tablePath)) {
            throw new IllegalArgumentException("tablePath must not be blank");
        }

        String[] parts = java.util.Arrays.stream(tablePath.split("\\."))
                .map(String::trim)
                .filter(StringUtils::isNotBlank)
                .toArray(String[]::new);

        if (parts.length == 1) {
            return TablePath.of(
                    getParam().getDatabase(),
                    null,
                    parts[0]
            );
        }

        if (parts.length == 2) {
            return TablePath.of(
                    parts[0],
                    null,
                    parts[1]
            );
        }

        throw new IllegalArgumentException("Invalid MySQL tablePath: " + tablePath);
    }

    @Override
    protected String getListTableSql(String databaseName) {
        return String.format(
                "SELECT TABLE_NAME, TABLE_COMMENT " +
                        "FROM INFORMATION_SCHEMA.TABLES " +
                        "WHERE TABLE_SCHEMA = '%s' AND TABLE_TYPE = 'BASE TABLE' " +
                        "ORDER BY TABLE_NAME",
                databaseName
        );
    }

    @Override
    protected OptionVO buildTableOption(ResultSet rs) throws SQLException {
        String tableName = rs.getString("TABLE_NAME");
        String tableComment = rs.getString("TABLE_COMMENT");

        OptionVO option = new OptionVO();
        option.setValue(tableName);
        option.setLabel(tableComment != null && !tableComment.trim().isEmpty() ? tableComment : tableName);
        option.setDescription(tableComment);
        return option;
    }

    @Override
    protected String quoteIdentifier(String identifier) {
        return "`" + identifier + "`";
    }

    @Override
    protected DataSourceTableColumn buildColumn(Map<String, Object> item) {
        String columnName = item.get("COLUMN_NAME").toString();
        String columnType = item.get("COLUMN_TYPE").toString();
        String isNullable = item.get("IS_NULLABLE").toString();
        String columnComment = item.get("COLUMN_COMMENT").toString();
        String columnKey = item.get("COLUMN_KEY").toString();
        int ordinalPosition = Integer.parseInt(item.get("ORDINAL_POSITION").toString());

        return DataSourceTableColumn.builder()
                .isNullable(isNullable)
                .columnComment(columnComment)
                .columnKey(columnKey)
                .columnName(columnName)
                .sourceType(columnType)
                .ordinalPosition(ordinalPosition)
                .build();
    }

    @Override
    protected String getSelectColumnsSql(TablePath tablePath) {
        return String.format(
                SELECT_COLUMNS_SQL_TEMPLATE, tablePath.getDatabaseName(), tablePath.getTableName());
    }

    @Override
    protected String getSpecifiedColumnSql(TablePath tablePath, List<DataSourceTableColumn> columns) {
        List<String> columnNames = columns.stream()
                .map(DataSourceTableColumn::getColumnName)
                .collect(Collectors.toList());

        String quotedColumnNames = columnNames.stream()
                .map(name -> "'" + name + "'")
                .collect(Collectors.joining(", "));

        return String.format(SELECT_SPECIFIED_COLUMNS_SQL_TEMPLATE,
                tablePath.getDatabaseName(),
                tablePath.getTableName(),
                quotedColumnNames);
    }
}