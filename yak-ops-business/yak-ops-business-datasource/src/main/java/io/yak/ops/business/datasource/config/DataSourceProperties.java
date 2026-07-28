package io.yak.ops.business.datasource.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** 数据源管理模块配置。 */
@ConfigurationProperties(prefix = "yak.datasource")
public class DataSourceProperties {

  private boolean enabled = true;
  private final Database database = new Database();
  private final ConnectionTest connectionTest = new ConnectionTest();

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public Database getDatabase() {
    return database;
  }

  public ConnectionTest getConnectionTest() {
    return connectionTest;
  }

  /** 数据源管理元数据数据库配置。 */
  public static class Database {

    private String url =
        "jdbc:mariadb://127.0.0.1:3306/yak_security"
            + "?useUnicode=true&allowPublicKeyRetrieval=true&characterEncoding=UTF-8"
            + "&useSSL=false&serverTimezone=Asia/Shanghai";
    private String username = "root";
    private String password = "123456";
    private String driverClassName = "org.mariadb.jdbc.Driver";
    private int minimumIdle = 1;
    private int maximumPoolSize = 8;

    public String getUrl() {
      return url;
    }

    public void setUrl(String url) {
      this.url = url;
    }

    public String getUsername() {
      return username;
    }

    public void setUsername(String username) {
      this.username = username;
    }

    public String getPassword() {
      return password;
    }

    public void setPassword(String password) {
      this.password = password;
    }

    public String getDriverClassName() {
      return driverClassName;
    }

    public void setDriverClassName(String driverClassName) {
      this.driverClassName = driverClassName;
    }

    public int getMinimumIdle() {
      return minimumIdle;
    }

    public void setMinimumIdle(int minimumIdle) {
      this.minimumIdle = minimumIdle;
    }

    public int getMaximumPoolSize() {
      return maximumPoolSize;
    }

    public void setMaximumPoolSize(int maximumPoolSize) {
      this.maximumPoolSize = maximumPoolSize;
    }
  }

  /** 用户配置的数据源连接测试参数。 */
  public static class ConnectionTest {

    private int timeoutSeconds = 5;

    public int getTimeoutSeconds() {
      return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
      this.timeoutSeconds = timeoutSeconds;
    }
  }
}
