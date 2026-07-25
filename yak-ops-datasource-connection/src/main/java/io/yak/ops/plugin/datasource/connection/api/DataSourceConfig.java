package io.yak.ops.plugin.datasource.connection.api;

import java.io.Serializable;
import java.util.Map;
import java.util.Properties;

public final class DataSourceConfig implements Serializable {
    private final DataSourceId dataSourceId;

    private final String url;
    private final String user;
    private final String password;
    private final Map<String, Object> properties;

    private final DriverDescriptor driver;

    public DataSourceConfig(
            DataSourceId dataSourceId,
            String url,
            String user,
            String password,
            Map<String, Object> properties,
            DriverDescriptor driver) {
        this.dataSourceId = dataSourceId;
        this.url = url;
        this.user = user;
        this.password = password;
        this.properties = properties;
        this.driver = driver;
    }

    public DataSourceId getDataSourceId() { return dataSourceId; }
    public String getUrl() { return url; }
    public DriverDescriptor getDriver() { return driver; }

    public Properties toJdbcProperties() {
        Properties info = new Properties();
        if (user != null && !user.isEmpty()) info.put("user", user);
        if (password != null && !password.isEmpty()) info.put("password", password);
        if (properties != null) {
            properties.forEach((k, v) -> {
                if (k != null && v != null) info.put(k, v);
            });
        }
        return info;
    }
}

