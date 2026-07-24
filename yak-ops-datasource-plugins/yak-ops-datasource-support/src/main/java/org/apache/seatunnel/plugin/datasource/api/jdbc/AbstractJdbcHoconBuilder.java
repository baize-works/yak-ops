package org.apache.seatunnel.plugin.datasource.api.jdbc;

import com.typesafe.config.Config;
import org.apache.commons.lang3.StringUtils;

import java.util.Map;
import static org.apache.seatunnel.plugin.datasource.api.hocon.JdbcBatchConstants.*;


public abstract class AbstractJdbcHoconBuilder {

    protected abstract String defaultDriver();

    protected String processPassword(String rawPassword) {
        return rawPassword;
    }

    protected void putConnCommon(Config conn, Map<String, Object> map) {
        map.put(URL, JdbcConfigReaders.getStringRequired(conn, URL));
        map.put(USERNAME, JdbcConfigReaders.getStringRequired(conn, USER));

        String driver = JdbcConfigReaders.getString(conn, DRIVER, "");
        if (StringUtils.isBlank(driver)) {
            driver = defaultDriver();
        }
        map.put(DRIVER, driver);

        String password = JdbcConfigReaders.getString(conn, PASSWORD, "");
        if (StringUtils.isNotBlank(password)) {
            map.put(PASSWORD, processPassword(password));
        }
    }

    protected String buildTablePath(String database, String schema, String table) {
        if (StringUtils.isBlank(table)) {
            throw new IllegalArgumentException("Table must not be blank");
        }

        if (StringUtils.isBlank(database) && StringUtils.isBlank(schema)) {
            return table;
        }
        if (StringUtils.isBlank(schema)) {
            return database + "." + table;
        }
        if (StringUtils.isBlank(database)) {
            return schema + "." + table;
        }
        return database + "." + schema + "." + table;
    }
}