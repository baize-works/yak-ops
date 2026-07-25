package org.apache.seatunnel.plugin.datasource.mysql.cdc.support;

import lombok.extern.slf4j.Slf4j;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

@Slf4j
public final class MysqlCdcPrecheckQuerySupport {

    private MysqlCdcPrecheckQuerySupport() {
    }

    public static String queryVariable(Connection connection, String variableName) {
        String sql = "SHOW VARIABLES LIKE '" + variableName + "'";

        try (Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery(sql)) {

            if (rs.next()) {
                return rs.getString("Value");
            }

            return null;
        } catch (Exception e) {
            log.warn("Query MySQL variable failed, variable={}", variableName, e);
            return null;
        }
    }

    public static String queryGrants(Connection connection) {
        StringBuilder builder = new StringBuilder();

        try (Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery("SHOW GRANTS FOR CURRENT_USER")) {

            while (rs.next()) {
                builder.append(rs.getString(1)).append('\n');
            }

            return builder.toString();
        } catch (Exception e) {
            log.warn("Query MySQL grants failed", e);
            return null;
        }
    }
}