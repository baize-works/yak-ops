package org.apache.seatunnel.plugin.datasource.oracle.metadata;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.jdbc.AbstractJdbcCatalog;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConnectionProvider;
import org.apache.seatunnel.plugin.datasource.api.jdbc.TablePath;
import org.apache.seatunnel.plugin.datasource.api.modal.DataSourceTableColumn;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
public class OracleCatalog extends AbstractJdbcCatalog {

    private static final String SELECT_COLUMNS_SQL_TEMPLATE =
            "SELECT COLUMN_NAME, DATA_TYPE, NULLABLE, COLUMN_ID FROM ALL_TAB_COLUMNS " +
                    "WHERE OWNER = '%s' AND TABLE_NAME = '%s' ORDER BY COLUMN_ID ASC";

    private static final String SELECT_SPECIFIED_COLUMNS_SQL_TEMPLATE =
            "SELECT COLUMN_NAME, DATA_TYPE, NULLABLE, COLUMN_ID FROM ALL_TAB_COLUMNS " +
                    "WHERE OWNER = '%s' AND TABLE_NAME = '%s' AND COLUMN_NAME IN (%s) ORDER BY COLUMN_ID ASC";

    public OracleCatalog(BaseConnectionParam param, JdbcConnectionProvider connectionManager) {
        super(param, connectionManager);
    }

    @Override
    protected String quoteIdentifier(String identifier) {
        return "\"" + identifier + "\"";
    }

    @Override
    protected String formatDateTimeLiteral(LocalDateTime dateTime) {
        return "TO_TIMESTAMP('" +
                dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) +
                "', 'YYYY-MM-DD HH24:MI:SS')";
    }

    @Override
    protected String applyLimit(String sql, int limit) {
        return sql + " FETCH NEXT " + limit + " ROWS ONLY";
    }

    @Override
    protected String getTableName(ResultSet rs) throws SQLException {
        return rs.getString(1);
    }

    @Override
    protected String getListTableSql(String databaseName) {
        String owner = resolveOwner();

        if (StringUtils.isBlank(owner)) {
            return "SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME";
        }

        return String.format(
                "SELECT TABLE_NAME FROM ALL_TABLES WHERE OWNER = '%s' ORDER BY TABLE_NAME",
                escapeSql(owner.toUpperCase(Locale.ROOT))
        );
    }

    private String resolveOwner() {
        BaseConnectionParam param = getParam();

        if (StringUtils.isNotBlank(param.getUser())) {
            return param.getUser().toUpperCase();
        }

        if (StringUtils.isNotBlank(param.getSchemaName())) {
            return param.getSchemaName().toUpperCase();
        }
        return null;
    }

    private String escapeSql(String value) {
        return value == null ? null : value.replace("'", "''");
    }

    @Override
    protected DataSourceTableColumn buildColumn(Map<String, Object> item) {
        String columnName = item.get("COLUMN_NAME").toString();
        String columnType = item.get("DATA_TYPE").toString();
        String isNullable = item.get("NULLABLE").toString();
        String columnComment = item.getOrDefault("COMMENTS", "").toString();
        String columnKey = item.getOrDefault("COLUMN_KEY", "").toString();
        int ordinalPosition = Integer.parseInt(item.get("COLUMN_ID").toString());

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
                SELECT_COLUMNS_SQL_TEMPLATE,
                resolveOwnerForTablePath(tablePath),
                tablePath.getTableName());
    }

    @Override
    protected String getSpecifiedColumnSql(TablePath tablePath, List<DataSourceTableColumn> columns) {
        List<String> columnNames = columns.stream()
                .map(DataSourceTableColumn::getColumnName)
                .collect(java.util.stream.Collectors.toList());

        String quotedColumnNames = columnNames.stream()
                .map(name -> "'" + escapeSql(name.toUpperCase(Locale.ROOT)) + "'")
                .collect(Collectors.joining(", "));

        return String.format(
                SELECT_SPECIFIED_COLUMNS_SQL_TEMPLATE,
                resolveOwnerForTablePath(tablePath),
                tablePath.getTableName(),
                quotedColumnNames
        );
    }

    public String buildTableReference(TablePath tablePath) {
        String tableName = tablePath.getTableName();
        if (StringUtils.isBlank(tableName)) {
            throw new IllegalArgumentException("table is null");
        }

        String owner = tablePath.getSchemaName();
        if (StringUtils.isBlank(owner)) {
            owner = resolveOwner();
        }

        if (StringUtils.isBlank(owner)) {
            return quoteIdentifier(tableName);
        }

        return quoteIdentifier(owner.toUpperCase()) + "." + quoteIdentifier(tableName);
    }

    private String resolveOwnerForTablePath(TablePath tablePath) {
        String owner = tablePath.getSchemaName();

        if (StringUtils.isBlank(owner)) {
            owner = resolveOwner();
        }

        if (StringUtils.isBlank(owner)) {
            throw new IllegalArgumentException("Oracle owner/schema must not be blank");
        }

        return escapeSql(owner.toUpperCase(Locale.ROOT));
    }
}
