package io.yak.ops.business.development.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Persistence settings for the data-development control plane. */
@ConfigurationProperties(prefix = "yak.data-development")
public class DataDevelopmentProperties {

  private boolean enabled;
  private final Datasource datasource = new Datasource();

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public Datasource getDatasource() {
    return datasource;
  }

  public static class Datasource {

    private String url;
    private String username;
    private String password;
    private String driverClassName = "com.mysql.cj.jdbc.Driver";
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
}
