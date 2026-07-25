package org.apache.seatunnel.plugin.datasource.doris.metadata;

import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.jdbc.AbstractJdbcCatalog;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConnectionProvider;
import org.apache.seatunnel.plugin.datasource.api.jdbc.TablePath;
import org.apache.seatunnel.plugin.datasource.api.modal.DataSourceTableColumn;
import org.apache.seatunnel.plugin.datasource.api.model.DatasourceOption;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Doris 元数据服务。
 *
 * <p>所有元数据操作（库表列表、字段信息、数据预览等）均通过 JDBC 连接
 * （MySQL 协议端口 9030）执行 SQL 完成，如 SHOW TABLES、INFORMATION_SCHEMA 查询等。</p>
 */
@Slf4j
public class DorisCatalog extends AbstractJdbcCatalog {

    public DorisCatalog(BaseConnectionParam param, JdbcConnectionProvider connectionManager) {
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
    protected DatasourceOption buildTableOption(ResultSet rs) throws SQLException {
        String tableName = rs.getString("TABLE_NAME");
        String tableComment = rs.getString("TABLE_COMMENT");

        DatasourceOption option = new DatasourceOption();
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
        String columnComment = item.getOrDefault("COLUMN_COMMENT", "").toString();
        String columnKey = item.getOrDefault("COLUMN_KEY", "").toString();
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
                "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '%s' AND TABLE_NAME = '%s' ORDER BY ORDINAL_POSITION ASC",
                tablePath.getDatabaseName(), tablePath.getTableName());
    }

    @Override
    protected String getSpecifiedColumnSql(TablePath tablePath, List<DataSourceTableColumn> columns) {
        List<String> columnNames = columns.stream()
                .map(DataSourceTableColumn::getColumnName)
                .collect(java.util.stream.Collectors.toList());

        String quotedColumnNames = columnNames.stream()
                .map(name -> "'" + name + "'")
                .collect(Collectors.joining(", "));

        return String.format(
                "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '%s' AND TABLE_NAME = '%s' AND COLUMN_NAME IN (%s) ORDER BY ORDINAL_POSITION ASC",
                tablePath.getDatabaseName(),
                tablePath.getTableName(),
                quotedColumnNames);
    }

    /**
     * 获取用于连通性测试过滤条件的字段名。
     *
     * <p>通过 SHOW PARTITIONS 查询判断表是否为分区表：
     * 如果是分区表，返回分区字段名；如果不是分区表，返回第一个字段名。</p>
     *
     * @param database 数据库名
     * @param table    表名
     * @return 用于过滤条件的字段名
     */
    public String getFilterColumn(String database, String table) {
        try (Connection conn = getConnection()) {
            // 尝试通过 SHOW PARTITIONS 获取分区字段
            String partitionCol = tryGetPartitionColumn(conn, database, table);
            if (partitionCol != null) {
                return partitionCol;
            }
            // 非分区表，使用第一个字段
            return getFirstColumn(conn, database, table);
        } catch (SQLException e) {
            throw new RuntimeException(
                    String.format("获取表 '%s.%s' 的过滤字段失败", database, table), e);
        }
    }

    /**
     * 通过 SHOW PARTITIONS 尝试获取分区字段名。
     *
     * @return 分区字段名，如果不是分区表或无法获取则返回 null
     */
    private String tryGetPartitionColumn(Connection conn, String database, String table)
            throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                String.format("SHOW PARTITIONS FROM `%s`.`%s`", database, table));
             ResultSet rs = ps.executeQuery()) {
            ResultSetMetaData meta = rs.getMetaData();
            // 查找 PartitionKey 列
            int pkIndex = -1;
            for (int i = 1; i <= meta.getColumnCount(); i++) {
                if ("PartitionKey".equalsIgnoreCase(meta.getColumnName(i))) {
                    pkIndex = i;
                    break;
                }
            }
            if (pkIndex < 0) {
                return null;
            }
            while (rs.next()) {
                String key = rs.getString(pkIndex);
                if (key != null && !key.isEmpty()) {
                    return key;
                }
            }
        }
        return null;
    }

    /**
     * 获取表的第一个字段名（按 ORDINAL_POSITION 排序）。
     */
    private String getFirstColumn(Connection conn, String database, String table)
            throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(String.format(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS " +
                        "WHERE TABLE_SCHEMA = '%s' AND TABLE_NAME = '%s' AND IS_NULLABLE ='NO'" +
                        "ORDER BY ORDINAL_POSITION ASC LIMIT 1",
                database, table));
             ResultSet rs = ps.executeQuery()) {
            if (rs.next()) {
                return rs.getString(1);
            }
        }
        throw new IllegalStateException(
                String.format("表 '%s.%s' 没有找到任何字段", database, table));
    }
}
