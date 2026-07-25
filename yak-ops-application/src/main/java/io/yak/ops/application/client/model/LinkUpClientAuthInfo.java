package io.yak.ops.application.client.model;

import lombok.Builder;
import lombok.Data;

/**
 * Authentication information used to access LinkUp client endpoints.
 *
 * <p>This model describes the authentication configuration required when calling
 * LinkUp REST APIs. It currently supports basic username/password authentication
 * and leaves extension fields for future authentication mechanisms.</p>
 */
@Data
@Builder
public class LinkUpClientAuthInfo {

    /**
     * Whether authentication is enabled for the LinkUp client.
     *
     * <p>When this value is false or null, the runtime gateway may access the endpoint
     * without authentication.</p>
     */
    private Boolean authEnabled;

    /**
     * Username used for basic authentication.
     */
    private String username;

    /**
     * Password used for basic authentication.
     */
    private String password;

    /**
     * Reserved token field for future authentication extensions.
     *
     * <p>This field can be used later for token, API key, or TLS-related authentication
     * mechanisms.</p>
     */
    private String token;
}
