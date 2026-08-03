package io.yak.ops.business.sync.offline.worker;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.yak.ops.business.sync.offline.config.OfflineWorkerRegistrationProperties;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerRegistrationRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.web.server.ResponseStatusException;

class OfflineWorkerRegistrationAuthenticatorTest {

  @Test
  void acceptsValidSignatureAndConsumesNonce() throws Exception {
    OfflineWorkerRegistrationProperties properties = properties();
    OfflineWorkerRegistrationRepository repository =
        mock(OfflineWorkerRegistrationRepository.class);
    when(repository.consumeNonce(
        ArgumentMatchers.anyString(),
        ArgumentMatchers.any(LocalDateTime.class))).thenReturn(true);
    OfflineWorkerRegistrationAuthenticator authenticator =
        new OfflineWorkerRegistrationAuthenticator(properties, repository);

    String body = "{\"nodeId\":\"worker-a\"}";
    String timestamp = String.valueOf(System.currentTimeMillis());
    String nonce = "1234567890abcdef1234567890abcdef";
    HttpServletRequest request = request(
        timestamp,
        nonce,
        sign("POST", "/api/v1/offline/worker-registration/register",
            timestamp, nonce, body, properties.getSecret()));

    authenticator.authenticate(request, body);

    verify(repository).consumeNonce(
        ArgumentMatchers.anyString(),
        ArgumentMatchers.any(LocalDateTime.class));
  }

  @Test
  void rejectsReplayedNonce() throws Exception {
    OfflineWorkerRegistrationProperties properties = properties();
    OfflineWorkerRegistrationRepository repository =
        mock(OfflineWorkerRegistrationRepository.class);
    when(repository.consumeNonce(
        ArgumentMatchers.anyString(),
        ArgumentMatchers.any(LocalDateTime.class))).thenReturn(false);
    OfflineWorkerRegistrationAuthenticator authenticator =
        new OfflineWorkerRegistrationAuthenticator(properties, repository);

    String body = "{}";
    String timestamp = String.valueOf(System.currentTimeMillis());
    String nonce = "1234567890abcdef1234567890abcdef";
    HttpServletRequest request = request(
        timestamp,
        nonce,
        sign("POST", "/api/v1/offline/worker-registration/register",
            timestamp, nonce, body, properties.getSecret()));

    assertThatThrownBy(() -> authenticator.authenticate(request, body))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("nonce 已使用");
  }

  @Test
  void rejectsBodyTamperingBeforeNonceIsConsumed() throws Exception {
    OfflineWorkerRegistrationProperties properties = properties();
    OfflineWorkerRegistrationRepository repository =
        mock(OfflineWorkerRegistrationRepository.class);
    OfflineWorkerRegistrationAuthenticator authenticator =
        new OfflineWorkerRegistrationAuthenticator(properties, repository);

    String timestamp = String.valueOf(System.currentTimeMillis());
    String nonce = "1234567890abcdef1234567890abcdef";
    HttpServletRequest request = request(
        timestamp,
        nonce,
        sign("POST", "/api/v1/offline/worker-registration/register",
            timestamp, nonce, "{\"value\":1}", properties.getSecret()));

    assertThatThrownBy(() -> authenticator.authenticate(request, "{\"value\":2}"))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("签名校验失败");
  }

  private OfflineWorkerRegistrationProperties properties() {
    OfflineWorkerRegistrationProperties properties =
        new OfflineWorkerRegistrationProperties();
    properties.setEnabled(true);
    properties.setSecret("0123456789abcdef/");
    return properties;
  }

  private HttpServletRequest request(
      String timestamp,
      String nonce,
      String signature) {
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getMethod()).thenReturn("POST");
    when(request.getRequestURI())
        .thenReturn("/api/v1/offline/worker-registration/register");
    when(request.getHeader(OfflineWorkerRegistrationAuthenticator.HEADER_TIMESTAMP))
        .thenReturn(timestamp);
    when(request.getHeader(OfflineWorkerRegistrationAuthenticator.HEADER_NONCE))
        .thenReturn(nonce);
    when(request.getHeader(OfflineWorkerRegistrationAuthenticator.HEADER_SIGNATURE))
        .thenReturn(signature);
    return request;
  }

  private String sign(
      String method,
      String path,
      String timestamp,
      String nonce,
      String body,
      String secret) throws Exception {
    String bodyHash = HexFormat.of().formatHex(
        MessageDigest.getInstance("SHA-256")
            .digest(body.getBytes(StandardCharsets.UTF_8)));
    String canonical = method + "\n" + path + "\n" + timestamp + "\n" + nonce
        + "\n" + bodyHash;
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    return HexFormat.of().formatHex(
        mac.doFinal(canonical.getBytes(StandardCharsets.UTF_8)));
  }
}
