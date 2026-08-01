package io.yak.ops.business.sync.offline.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** 离线同步控制面、持久化和单 Link-Up Worker 配置。 */
@ConfigurationProperties(prefix = "yak.sync.offline")
public class OfflineSyncProperties {

  private boolean enabled = true;
  private final Datasource datasource = new Datasource();
  private final Engine engine = new Engine();
  private final Control control = new Control();

  public boolean isEnabled() { return enabled; }
  public void setEnabled(boolean enabled) { this.enabled = enabled; }
  public Datasource getDatasource() { return datasource; }
  public Engine getEngine() { return engine; }
  public Control getControl() { return control; }

  public static class Datasource {
    private String url =
        "jdbc:mariadb://127.0.0.1:3306/yak_security?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai";
    private String username = "root";
    private String password = "123456";
    private String driverClassName = "org.mariadb.jdbc.Driver";
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

  public static class Engine {
    private boolean enabled = true;
    private String nodeId = "link-up-node-1";
    private String nodeName = "Link-Up Offline Worker";
    private String baseUrl = "http://127.0.0.1:18080";
    private Duration connectTimeout = Duration.ofSeconds(10);
    private Duration requestTimeout = Duration.ofSeconds(30);

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getNodeId() { return nodeId; }
    public void setNodeId(String nodeId) { this.nodeId = nodeId; }
    public String getNodeName() { return nodeName; }
    public void setNodeName(String nodeName) { this.nodeName = nodeName; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    public Duration getConnectTimeout() { return connectTimeout; }
    public void setConnectTimeout(Duration connectTimeout) { this.connectTimeout = connectTimeout; }
    public Duration getRequestTimeout() { return requestTimeout; }
    public void setRequestTimeout(Duration requestTimeout) { this.requestTimeout = requestTimeout; }
  }

  public static class Control {
    private long reconcileDelayMillis = 5_000L;
    private long heartbeatDelayMillis = 10_000L;
    private long scheduleDelayMillis = 5_000L;
    private long lostAfterMillis = 120_000L;
    private int scanBatchSize = 100;
    private int defaultMaxAttempts = 1;
    private int defaultRetryBackoffSeconds = 30;
    private boolean alertOnFailed = true;
    private boolean alertOnLost = true;

    public long getReconcileDelayMillis() { return reconcileDelayMillis; }
    public void setReconcileDelayMillis(long value) { this.reconcileDelayMillis = value; }
    public long getHeartbeatDelayMillis() { return heartbeatDelayMillis; }
    public void setHeartbeatDelayMillis(long value) { this.heartbeatDelayMillis = value; }
    public long getScheduleDelayMillis() { return scheduleDelayMillis; }
    public void setScheduleDelayMillis(long value) { this.scheduleDelayMillis = value; }
    public long getLostAfterMillis() { return lostAfterMillis; }
    public void setLostAfterMillis(long value) { this.lostAfterMillis = value; }
    public int getScanBatchSize() { return scanBatchSize; }
    public void setScanBatchSize(int value) { this.scanBatchSize = value; }
    public int getDefaultMaxAttempts() { return defaultMaxAttempts; }
    public void setDefaultMaxAttempts(int value) { this.defaultMaxAttempts = value; }
    public int getDefaultRetryBackoffSeconds() { return defaultRetryBackoffSeconds; }
    public void setDefaultRetryBackoffSeconds(int value) { this.defaultRetryBackoffSeconds = value; }
    public boolean isAlertOnFailed() { return alertOnFailed; }
    public void setAlertOnFailed(boolean value) { this.alertOnFailed = value; }
    public boolean isAlertOnLost() { return alertOnLost; }
    public void setAlertOnLost(boolean value) { this.alertOnLost = value; }
  }
}
