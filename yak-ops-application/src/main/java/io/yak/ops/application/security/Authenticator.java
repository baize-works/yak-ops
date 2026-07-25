package io.yak.ops.application.security;

import java.util.Map;

public interface Authenticator {
    /**
     * Verifying legality via username and password
     * @param userId user name
     * @param password user password
     * @param extra extra info
     * @return result object
     */
    Map<String, String> authenticate(String userId, String password, String extra);
}
