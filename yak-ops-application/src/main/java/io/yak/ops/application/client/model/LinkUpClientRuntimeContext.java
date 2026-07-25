package io.yak.ops.application.client.model;

import lombok.Builder;
import lombok.Data;

/**
 * Runtime context of a LinkUp client.
 *
 * <p>This model represents the resolved runtime access information of a client.
 * It is usually built after selecting an active master endpoint and is used when
 * calling LinkUp runtime APIs.</p>
 *
 * <p>Compared with {@link LinkUpClientSpec}, this context focuses on the actual
 * runtime entry point instead of the original user configuration.</p>
 */
@Data
@Builder
public class LinkUpClientRuntimeContext {

    /**
     * LinkUp client id.
     */
    private Long clientId;

    /**
     * Active runtime base URL.
     *
     * <p>This value usually points to the active master REST endpoint, such as
     * http://127.0.0.1:5801.</p>
     */
    private String baseUrl;

    /**
     * LinkUp client name.
     */
    private String clientName;

    /**
     * LinkUp client version resolved from the runtime.
     */
    private String clientVersion;

    /**
     * Authentication information used to access the runtime endpoint.
     */
    private LinkUpClientAuthInfo auth;
}
