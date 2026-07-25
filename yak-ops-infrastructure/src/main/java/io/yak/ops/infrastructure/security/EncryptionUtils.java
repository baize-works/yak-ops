package io.yak.ops.infrastructure.security;

import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.lang3.StringUtils;

/**
 * encryption utils
 */
public class EncryptionUtils {

    private EncryptionUtils() {
        throw new UnsupportedOperationException("Construct EncryptionUtils");
    }

    /**
     * @param rawStr raw string
     * @return md5(rawStr)
     */
    public static String getMd5(String rawStr) {
        return DigestUtils.md5Hex(null == rawStr ? StringUtils.EMPTY : rawStr);
    }

    public static void main(String[] args) {
        String md5 = getMd5("123456");
        System.out.println("md5 = " + md5);
    }

}
