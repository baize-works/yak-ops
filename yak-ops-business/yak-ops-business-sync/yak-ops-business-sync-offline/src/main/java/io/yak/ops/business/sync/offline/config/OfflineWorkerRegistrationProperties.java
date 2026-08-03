package io.yak.ops.business.sync.offline.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Link-Up Worker 主动注册、心跳续租和防重放配置。 */
@ConditionalOnOfflineSyncEnabled
@Component
@ConfigurationProperties(prefix = "yak.sync.offline.registration")
public class OfflineWorkerRegistrationProperties {

  /** 是否开放动态注册接口。默认关闭，配置共享密钥后再显式开启。 */
  private boolean enabled = false;

  /** HMAC-SHA256 共享密钥，不会持久化到数据库。 */
  private String secret;

  /** 新动态 Worker 首次登记后是否自动允许调度。 */
  private boolean autoEnable = true;

  /** 控制面建议的心跳间隔。 */
  private long heartbeatIntervalMillis = 20_000L;

  /** 每次注册或心跳续期后的租约时长。 */
  private long leaseDurationMillis = 90_000L;

  /** 请求时间戳允许的最大偏差。 */
  private long clockSkewMillis = 300_000L;

  /** nonce 保留时间，保留期内相同 nonce 只能使用一次。 */
  private long nonceRetentionMillis = 600_000L;

  /** 租约过期扫描的初始延迟。 */
  private long cleanupInitialDelayMillis = 10_000L;

  /** 租约过期和 nonce 清理间隔。 */
  private long cleanupDelayMillis = 10_000L;

  public boolean isEnabled() { return enabled; }
  public void setEnabled(boolean enabled) { this.enabled = enabled; }
  public String getSecret() { return secret; }
  public void setSecret(String secret) { this.secret = secret; }
  public boolean isAutoEnable() { return autoEnable; }
  public void setAutoEnable(boolean autoEnable) { this.autoEnable = autoEnable; }
  public long getHeartbeatIntervalMillis() { return heartbeatIntervalMillis; }
  public void setHeartbeatIntervalMillis(long heartbeatIntervalMillis) {
    this.heartbeatIntervalMillis = heartbeatIntervalMillis;
  }
  public long getLeaseDurationMillis() { return leaseDurationMillis; }
  public void setLeaseDurationMillis(long leaseDurationMillis) {
    this.leaseDurationMillis = leaseDurationMillis;
  }
  public long getClockSkewMillis() { return clockSkewMillis; }
  public void setClockSkewMillis(long clockSkewMillis) { this.clockSkewMillis = clockSkewMillis; }
  public long getNonceRetentionMillis() { return nonceRetentionMillis; }
  public void setNonceRetentionMillis(long nonceRetentionMillis) {
    this.nonceRetentionMillis = nonceRetentionMillis;
  }
  public long getCleanupInitialDelayMillis() { return cleanupInitialDelayMillis; }
  public void setCleanupInitialDelayMillis(long cleanupInitialDelayMillis) {
    this.cleanupInitialDelayMillis = cleanupInitialDelayMillis;
  }
  public long getCleanupDelayMillis() { return cleanupDelayMillis; }
  public void setCleanupDelayMillis(long cleanupDelayMillis) {
    this.cleanupDelayMillis = cleanupDelayMillis;
  }
}
