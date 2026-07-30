package io.yak.ops.business.sync.offline.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** 离线同步任务、持久化与 Link-Up 引擎配置。 */
@ConfigurationProperties(prefix = "yak.sync.offline")
public class OfflineSyncProperties {

  private boolean enabled = true;
  private final Datasource datasource = new Datasource();
  private final Engine engine = new Engine();

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public Datasource getDatasource() {
    return datasource;
  }

  public Engine getEngine() {
    return engine;
  }

  public static class Datasource {

    private String url =
        "jdbc:mariadb://127.0.0.1:3306/yak_security?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai";
    private String username = "root";
    private String password = "123456";
    private String driverClassName = "org.mariadb.jdbc.Driver";
    private int maximumPoolSize = 8;
    private int minimumIdle = 1;

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

    public int getMaximumPoolSize() {
      return maximumPoolSize;
    }

    public void setMaximumPoolSize(int maximumPoolSize) {
      this.maximumPoolSize = maximumPoolSize;
    }

    public int getMinimumIdle() {
      return minimumIdle;
    }

    public void setMinimumIdle(int minimumIdle) {
      this.minimumIdle = minimumIdle;
    }
  }

  public static class Engine {

    private boolean enabled = true;
    private String baseUrl = "http://127.0.0.1:18080";
    private Duration connectTimeout = Duration.ofSeconds(10);
    private Duration requestTimeout = Duration.ofSeconds(30);

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }

    public String getBaseUrl() {
      return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
      this.baseUrl = baseUrl;
    }

    public Duration getConnectTimeout() {
      return connectTimeout;
    }

    public void setConnectTimeout(Duration connectTimeout) {
      this.connectTimeout = connectTimeout;
    }

    public Duration getRequestTimeout() {
      return requestTimeout;
    }

    public void setRequestTimeout(Duration requestTimeout) {
      this.requestTimeout = requestTimeout;
    }
  }
}
