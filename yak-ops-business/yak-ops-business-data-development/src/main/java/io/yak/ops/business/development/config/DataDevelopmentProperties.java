package io.yak.ops.business.development.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Persistence, execution-gateway and platform-governance settings. */
@ConfigurationProperties(prefix = "yak.data-development")
public class DataDevelopmentProperties {

  private boolean enabled;
  private final Datasource datasource = new Datasource();
  private final Execution execution = new Execution();
  private final Platform platform = new Platform();

  public boolean isEnabled() { return enabled; }
  public void setEnabled(boolean enabled) { this.enabled = enabled; }
  public Datasource getDatasource() { return datasource; }
  public Execution getExecution() { return execution; }
  public Platform getPlatform() { return platform; }

  public static class Datasource {
    private String url;
    private String username;
    private String password;
    private String driverClassName = "com.mysql.cj.jdbc.Driver";
    private int maximumPoolSize = 8;
    private int minimumIdle = 1;

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getDriverClassName() { return driverClassName; }
    public void setDriverClassName(String driverClassName) { this.driverClassName = driverClassName; }
    public int getMaximumPoolSize() { return maximumPoolSize; }
    public void setMaximumPoolSize(int maximumPoolSize) { this.maximumPoolSize = maximumPoolSize; }
    public int getMinimumIdle() { return minimumIdle; }
    public void setMinimumIdle(int minimumIdle) { this.minimumIdle = minimumIdle; }
  }

  public static class Execution {
    private int corePoolSize = 4;
    private int maximumPoolSize = 16;
    private int queueCapacity = 200;
    private int defaultTimeoutSeconds = 300;
    private int eventReplayLimit = 1000;
    private String workerId = "local-worker";

    public int getCorePoolSize() { return corePoolSize; }
    public void setCorePoolSize(int corePoolSize) { this.corePoolSize = corePoolSize; }
    public int getMaximumPoolSize() { return maximumPoolSize; }
    public void setMaximumPoolSize(int maximumPoolSize) { this.maximumPoolSize = maximumPoolSize; }
    public int getQueueCapacity() { return queueCapacity; }
    public void setQueueCapacity(int queueCapacity) { this.queueCapacity = queueCapacity; }
    public int getDefaultTimeoutSeconds() { return defaultTimeoutSeconds; }
    public void setDefaultTimeoutSeconds(int defaultTimeoutSeconds) { this.defaultTimeoutSeconds = defaultTimeoutSeconds; }
    public int getEventReplayLimit() { return eventReplayLimit; }
    public void setEventReplayLimit(int eventReplayLimit) { this.eventReplayLimit = eventReplayLimit; }
    public String getWorkerId() { return workerId; }
    public void setWorkerId(String workerId) { this.workerId = workerId; }
  }

  public static class Platform {
    /**
     * Master key used to derive the AES-GCM key for stored secrets.
     * Bind with YAK_DATA_DEVELOPMENT_PLATFORM_MASTER_KEY or
     * YAK_DATA_DEVELOPMENT_PLATFORM_MASTER_KEY depending on deployment conventions.
     */
    private String masterKey;
    private int healthCheckTimeoutSeconds = 5;

    public String getMasterKey() { return masterKey; }
    public void setMasterKey(String masterKey) { this.masterKey = masterKey; }
    public int getHealthCheckTimeoutSeconds() { return healthCheckTimeoutSeconds; }
    public void setHealthCheckTimeoutSeconds(int healthCheckTimeoutSeconds) {
      this.healthCheckTimeoutSeconds = healthCheckTimeoutSeconds;
    }
  }
}
