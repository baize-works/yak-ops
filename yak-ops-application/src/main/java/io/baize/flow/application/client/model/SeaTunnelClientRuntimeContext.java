package io.baize.flow.application.client.model;

import lombok.Builder;
import lombok.Data;

/**
 * Runtime context of a SeaTunnel client.
 *
 * <p>This model represents the resolved runtime access information of a client.
 * It is usually built after selecting an active master endpoint and is used when
 * calling SeaTunnel runtime APIs.</p>
 *
 * <p>Compared with {@link SeaTunnelClientSpec}, this context focuses on the actual
 * runtime entry point instead of the original user configuration.</p>
 */
@Data
@Builder
public class SeaTunnelClientRuntimeContext {

    /**
     * SeaTunnel client id.
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
     * SeaTunnel client name.
     */
    private String clientName;

    /**
     * SeaTunnel client version resolved from the runtime.
     */
    private String clientVersion;

    /**
     * Authentication information used to access the runtime endpoint.
     */
    private SeaTunnelClientAuthInfo auth;
}