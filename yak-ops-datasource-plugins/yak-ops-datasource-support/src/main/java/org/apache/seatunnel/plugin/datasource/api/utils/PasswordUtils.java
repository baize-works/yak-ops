package org.apache.seatunnel.plugin.datasource.api.utils;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base64;
import org.apache.commons.lang3.StringUtils;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;

@Slf4j
public class PasswordUtils {
    public static final String DATASOURCE_ENCRYPTION_SALT_DEFAULT = "!@#$%^&*";
    public static final String DATASOURCE_MASTER_KEY_ENV = "YAK_OPS_DATASOURCE_MASTER_KEY";
    private static final String AES_GCM_PREFIX = "aesgcm:";
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH_BITS = 128;
    private static final Base64 BASE64 = new Base64();
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private PasswordUtils() {
        throw new UnsupportedOperationException("Construct PasswordUtils");
    }

    /**
     * Encrypt datasource passwords before persistence. Set
     * YAK_OPS_DATASOURCE_MASTER_KEY from an external secret manager in production.
     */
    public static String encodePassword(String password) {
        if (StringUtils.isEmpty(password)) {
            return StringUtils.EMPTY;
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            SECURE_RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(resolveKey(), "AES"), new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] encrypted = cipher.doFinal(password.getBytes(StandardCharsets.UTF_8));
            ByteBuffer payload = ByteBuffer.allocate(iv.length + encrypted.length);
            payload.put(iv);
            payload.put(encrypted);
            return AES_GCM_PREFIX + java.util.Base64.getEncoder().encodeToString(payload.array());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encrypt datasource password", e);
        }
    }

    /**
     * Decrypt AES-GCM passwords. Legacy salted Base64 values are still accepted for migration compatibility.
     */
    public static String decodePassword(String password) {
        if (StringUtils.isEmpty(password)) {
            return StringUtils.EMPTY;
        }
        if (password.startsWith(AES_GCM_PREFIX)) {
            try {
                byte[] payload = java.util.Base64.getDecoder().decode(password.substring(AES_GCM_PREFIX.length()));
                ByteBuffer buffer = ByteBuffer.wrap(payload);
                byte[] iv = new byte[IV_LENGTH];
                buffer.get(iv);
                byte[] encrypted = new byte[buffer.remaining()];
                buffer.get(encrypted);
                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(resolveKey(), "AES"), new GCMParameterSpec(TAG_LENGTH_BITS, iv));
                return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
            } catch (Exception e) {
                throw new IllegalStateException("Failed to decrypt datasource password", e);
            }
        }
        String passwordWithSalt = new String(BASE64.decode(password), StandardCharsets.UTF_8);
        if (!passwordWithSalt.startsWith(DATASOURCE_ENCRYPTION_SALT_DEFAULT)) {
            log.warn("Datasource password is not encrypted with the supported format");
            return password;
        }
        return new String(BASE64.decode(passwordWithSalt.substring(DATASOURCE_ENCRYPTION_SALT_DEFAULT.length())), StandardCharsets.UTF_8);
    }

    private static byte[] resolveKey() throws Exception {
        String configuredKey = System.getenv(DATASOURCE_MASTER_KEY_ENV);
        if (StringUtils.isBlank(configuredKey)) {
            configuredKey = System.getProperty("baize.flow.datasource.master-key");
        }
        if (StringUtils.isBlank(configuredKey)) {
            throw new IllegalStateException("Missing datasource master key. Set " + DATASOURCE_MASTER_KEY_ENV);
        }
        return Arrays.copyOf(MessageDigest.getInstance("SHA-256").digest(configuredKey.getBytes(StandardCharsets.UTF_8)), 32);
    }
}
