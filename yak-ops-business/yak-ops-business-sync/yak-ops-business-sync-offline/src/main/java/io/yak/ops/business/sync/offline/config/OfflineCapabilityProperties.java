package io.yak.ops.business.sync.offline.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Link-Up Worker Connector 能力采集与调度配置。 */
@ConditionalOnOfflineSyncEnabled
@Component
@ConfigurationProperties(prefix = "yak.sync.offline.capability")
public class OfflineCapabilityProperties {

  /** 是否启用能力采集和能力调度。 */
  private boolean enabled = true;

  /** Schema 指纹不一致时是否拒绝调度。 */
  private boolean strictSchemaFingerprint = true;

  /** 能力快照超过该时间后视为过期。 */
  private long maxStaleMillis = 900_000L;

  /** 后台能力刷新初始延迟。 */
  private long initialDelayMillis = 10_000L;

  /** 后台扫描能力快照的间隔。 */
  private long refreshDelayMillis = 60_000L;

  /** 单个 Worker 能力快照的目标刷新周期。 */
  private long workerRefreshMillis = 300_000L;

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public boolean isStrictSchemaFingerprint() {
    return strictSchemaFingerprint;
  }

  public void setStrictSchemaFingerprint(boolean strictSchemaFingerprint) {
    this.strictSchemaFingerprint = strictSchemaFingerprint;
  }

  public long getMaxStaleMillis() {
    return maxStaleMillis;
  }

  public void setMaxStaleMillis(long maxStaleMillis) {
    this.maxStaleMillis = maxStaleMillis;
  }

  public long getInitialDelayMillis() {
    return initialDelayMillis;
  }

  public void setInitialDelayMillis(long initialDelayMillis) {
    this.initialDelayMillis = initialDelayMillis;
  }

  public long getRefreshDelayMillis() {
    return refreshDelayMillis;
  }

  public void setRefreshDelayMillis(long refreshDelayMillis) {
    this.refreshDelayMillis = refreshDelayMillis;
  }

  public long getWorkerRefreshMillis() {
    return workerRefreshMillis;
  }

  public void setWorkerRefreshMillis(long workerRefreshMillis) {
    this.workerRefreshMillis = workerRefreshMillis;
  }
}
