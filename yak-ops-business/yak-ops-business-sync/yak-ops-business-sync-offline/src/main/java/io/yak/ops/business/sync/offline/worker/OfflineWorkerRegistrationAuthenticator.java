package io.yak.ops.business.sync.offline.worker;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineWorkerRegistrationProperties;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerRegistrationRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

/** 使用 HMAC、时间戳和一次性 nonce 校验 Worker 主动注册请求。 */
@ConditionalOnOfflineSyncEnabled
@Component
public class OfflineWorkerRegistrationAuthenticator {

  public static final String HEADER_TIMESTAMP = "X-Yak-Registration-Timestamp";
  public static final String HEADER_NONCE = "X-Yak-Registration-Nonce";
  public static final String HEADER_SIGNATURE = "X-Yak-Registration-Signature";

  private final OfflineWorkerRegistrationProperties properties;
  private final OfflineWorkerRegistrationRepository repository;

  public OfflineWorkerRegistrationAuthenticator(
      OfflineWorkerRegistrationProperties properties,
      OfflineWorkerRegistrationRepository repository) {
    this.properties = properties;
    this.repository = repository;
  }

  public void authenticate(HttpServletRequest request, String body) {
    if (!properties.isEnabled()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "动态 Worker 注册未启用");
    }
    String secret = properties.getSecret();
    if (!StringUtils.hasText(secret) || secret.trim().length() < 16) {
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE,
          "动态 Worker 注册密钥未正确配置");
    }

    String timestampValue = header(request, HEADER_TIMESTAMP);
    String nonce = header(request, HEADER_NONCE);
    String signature = header(request, HEADER_SIGNATURE);
    if (!nonce.matches("[A-Za-z0-9_-]{16,128}")) {
      unauthorized("注册 nonce 格式不正确");
    }
    if (!signature.matches("(?i)[0-9a-f]{64}")) {
      unauthorized("注册签名格式不正确");
    }

    long timestamp;
    try {
      timestamp = Long.parseLong(timestampValue);
    } catch (NumberFormatException exception) {
      unauthorized("注册时间戳格式不正确");
      return;
    }
    long now = System.currentTimeMillis();
    long skew = Math.abs(now - timestamp);
    if (skew > Math.max(1_000L, properties.getClockSkewMillis())) {
      unauthorized("注册请求时间戳已过期");
    }

    String payload = body == null ? "" : body;
    String canonical = request.getMethod().toUpperCase()
        + "\n" + request.getRequestURI()
        + "\n" + timestampValue
        + "\n" + nonce
        + "\n" + sha256(payload);
    String expected = hmac(secret.trim(), canonical);
    if (!MessageDigest.isEqual(
        expected.getBytes(StandardCharsets.US_ASCII),
        signature.toLowerCase().getBytes(StandardCharsets.US_ASCII))) {
      unauthorized("动态注册签名校验失败");
    }

    LocalDateTime expiresAt = LocalDateTime.ofInstant(
        Instant.ofEpochMilli(now + Math.max(
            properties.getClockSkewMillis(),
            properties.getNonceRetentionMillis())),
        ZoneId.systemDefault());
    if (!repository.consumeNonce(sha256(nonce), expiresAt)) {
      unauthorized("动态注册请求 nonce 已使用");
    }
  }

  private String header(HttpServletRequest request, String name) {
    String value = request.getHeader(name);
    if (!StringUtils.hasText(value)) {
      unauthorized("缺少请求头 " + name);
    }
    return value.trim();
  }

  private String hmac(String secret, String value) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception exception) {
      throw new IllegalStateException("生成动态注册签名失败", exception);
    }
  }

  private String sha256(String value) {
    try {
      return HexFormat.of().formatHex(
          MessageDigest.getInstance("SHA-256")
              .digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception exception) {
      throw new IllegalStateException("生成动态注册摘要失败", exception);
    }
  }

  private void unauthorized(String message) {
    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, message);
  }
}
