package io.yak.ops.business.sync.offline.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Link-Up Connector Schema 同步与缓存配置。 */
@ConditionalOnOfflineSyncEnabled
@Component
@ConfigurationProperties(prefix = "yak.sync.offline.schema")
public class ConnectorSchemaProperties {

  private boolean enabled = true;
  private boolean refreshEnabled = true;
  private long initialDelayMillis = 5_000L;
  private long refreshDelayMillis = 300_000L;
  private long maxStaleMillis = 86_400_000L;

  public boolean isEnabled() { return enabled; }
  public void setEnabled(boolean enabled) { this.enabled = enabled; }
  public boolean isRefreshEnabled() { return refreshEnabled; }
  public void setRefreshEnabled(boolean refreshEnabled) { this.refreshEnabled = refreshEnabled; }
  public long getInitialDelayMillis() { return initialDelayMillis; }
  public void setInitialDelayMillis(long initialDelayMillis) { this.initialDelayMillis = initialDelayMillis; }
  public long getRefreshDelayMillis() { return refreshDelayMillis; }
  public void setRefreshDelayMillis(long refreshDelayMillis) { this.refreshDelayMillis = refreshDelayMillis; }
  public long getMaxStaleMillis() { return maxStaleMillis; }
  public void setMaxStaleMillis(long maxStaleMillis) { this.maxStaleMillis = maxStaleMillis; }
}
