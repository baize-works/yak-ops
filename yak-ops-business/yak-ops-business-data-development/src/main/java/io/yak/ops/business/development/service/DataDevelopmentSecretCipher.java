package io.yak.ops.business.development.service;

import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.config.DataDevelopmentProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** AES-GCM encryption boundary for platform secrets. */
@ConditionalOnDataDevelopmentEnabled
@Component
public final class DataDevelopmentSecretCipher {

  private static final String PREFIX = "v1:";
  private static final int IV_BYTES = 12;
  private static final int TAG_BITS = 128;

  private final SecureRandom random = new SecureRandom();
  private final SecretKeySpec key;

  public DataDevelopmentSecretCipher(DataDevelopmentProperties properties) {
    String masterKey = properties.getPlatform().getMasterKey();
    this.key = StringUtils.hasText(masterKey)
        ? new SecretKeySpec(sha256(masterKey.getBytes(StandardCharsets.UTF_8)), "AES")
        : null;
  }

  public boolean configured() {
    return key != null;
  }

  public String encrypt(String plaintext) {
    requireConfigured();
    if (!StringUtils.hasText(plaintext)) {
      throw new IllegalArgumentException("密钥值不能为空");
    }
    try {
      byte[] iv = new byte[IV_BYTES];
      random.nextBytes(iv);
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
      byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
      byte[] payload = new byte[iv.length + encrypted.length];
      System.arraycopy(iv, 0, payload, 0, iv.length);
      System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);
      return PREFIX + Base64.getEncoder().encodeToString(payload);
    } catch (Exception error) {
      throw new IllegalStateException("平台密钥加密失败", error);
    }
  }

  public String decrypt(String encryptedValue) {
    requireConfigured();
    if (encryptedValue == null || !encryptedValue.startsWith(PREFIX)) {
      throw new IllegalStateException("平台密钥格式不受支持");
    }
    try {
      byte[] payload = Base64.getDecoder().decode(encryptedValue.substring(PREFIX.length()));
      if (payload.length <= IV_BYTES) throw new IllegalStateException("平台密钥内容损坏");
      byte[] iv = new byte[IV_BYTES];
      byte[] encrypted = new byte[payload.length - IV_BYTES];
      System.arraycopy(payload, 0, iv, 0, IV_BYTES);
      System.arraycopy(payload, IV_BYTES, encrypted, 0, encrypted.length);
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
      return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
    } catch (IllegalStateException error) {
      throw error;
    } catch (Exception error) {
      throw new IllegalStateException("平台密钥解密失败，请检查主密钥配置", error);
    }
  }

  public String digest(String plaintext) {
    return hex(sha256(plaintext.getBytes(StandardCharsets.UTF_8)));
  }

  private void requireConfigured() {
    if (key == null) {
      throw new IllegalStateException(
          "未配置 YAK_DATA_DEVELOPMENT_PLATFORM_MASTER_KEY，无法读写平台密钥");
    }
  }

  private static byte[] sha256(byte[] value) {
    try {
      return MessageDigest.getInstance("SHA-256").digest(value);
    } catch (Exception error) {
      throw new IllegalStateException("SHA-256 不可用", error);
    }
  }

  private static String hex(byte[] value) {
    StringBuilder result = new StringBuilder(value.length * 2);
    for (byte item : value) result.append(String.format("%02x", item));
    return result.toString();
  }
}
