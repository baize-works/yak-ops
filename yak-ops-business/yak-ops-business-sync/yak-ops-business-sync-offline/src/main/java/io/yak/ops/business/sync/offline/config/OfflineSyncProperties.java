package io.yak.ops.business.sync.offline.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** 离线同步持久化、固定 Link-Up 地址与对账配置。 */
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
    private String url = "jdbc:mysql://127.0.0.1:3306/yak_security?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai";
    private String username = "root";
    private String password = "123456";
    private String driverClassName = "com.mysql.cj.jdbc.Driver";
    private int maximumPoolSize = 8;
    private int minimumIdle = 1;
    public String getUrl() { return url; }
    public void setUrl(String value) { url = value; }
    public String getUsername() { return username; }
    public void setUsername(String value) { username = value; }
    public String getPassword() { return password; }
    public void setPassword(String value) { password = value; }
    public String getDriverClassName() { return driverClassName; }
    public void setDriverClassName(String value) { driverClassName = value; }
    public int getMaximumPoolSize() { return maximumPoolSize; }
    public void setMaximumPoolSize(int value) { maximumPoolSize = value; }
    public int getMinimumIdle() { return minimumIdle; }
    public void setMinimumIdle(int value) { minimumIdle = value; }
  }

  public static class Engine {
    private boolean enabled = true;
    private String baseUrl = "http://127.0.0.1:18080";
    private Duration connectTimeout = Duration.ofSeconds(10);
    private Duration requestTimeout = Duration.ofSeconds(30);
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean value) { enabled = value; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String value) { baseUrl = value; }
    public Duration getConnectTimeout() { return connectTimeout; }
    public void setConnectTimeout(Duration value) { connectTimeout = value; }
    public Duration getRequestTimeout() { return requestTimeout; }
    public void setRequestTimeout(Duration value) { requestTimeout = value; }
  }

  public static class Control {
    private long reconcileDelayMillis = 5_000L;
    private long lostAfterMillis = 120_000L;
    private int scanBatchSize = 100;
    private int defaultMaxAttempts = 1;
    private int defaultRetryBackoffSeconds = 60;
    public long getReconcileDelayMillis() { return reconcileDelayMillis; }
    public void setReconcileDelayMillis(long value) { reconcileDelayMillis = value; }
    public long getLostAfterMillis() { return lostAfterMillis; }
    public void setLostAfterMillis(long value) { lostAfterMillis = value; }
    public int getScanBatchSize() { return scanBatchSize; }
    public void setScanBatchSize(int value) { scanBatchSize = value; }
    public int getDefaultMaxAttempts() { return defaultMaxAttempts; }
    public void setDefaultMaxAttempts(int value) { defaultMaxAttempts = value; }
    public int getDefaultRetryBackoffSeconds() { return defaultRetryBackoffSeconds; }
    public void setDefaultRetryBackoffSeconds(int value) { defaultRetryBackoffSeconds = value; }
  }
}
