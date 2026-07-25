package io.baize.flow.application.client.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Runtime specification of a SeaTunnel client.
 *
 * <p>This model represents the normalized client configuration used by the core
 * client module. It is usually converted from API request DTOs or persisted client
 * entities before building topology and activating the client.</p>
 */
@Data
@Builder
public class SeaTunnelClientSpec {

    /**
     * SeaTunnel client id.
     *
     * <p>This value may be null when creating a new client.</p>
     */
    private Long clientId;

    /**
     * SeaTunnel client name.
     */
    private String clientName;

    /**
     * Engine type of the client.
     *
     * <p>For the current implementation, this usually represents the SeaTunnel
     * engine type, such as Zeta.</p>
     */
    private String engineType;

    /**
     * Client deployment mode.
     *
     * <p>Typical values are SINGLE and SEPARATED_CLUSTER.</p>
     */
    private String deployMode;

    /**
     * Protocol used to access SeaTunnel REST endpoints.
     *
     * <p>Typical values are http and https.</p>
     */
    private String protocol;

    /**
     * Host used in SINGLE deployment mode.
     *
     * <p>In SINGLE mode, the host and port will be converted into one master endpoint.</p>
     */
    private String host;

    /**
     * Hostname of the server.
     * <p>For example: node1 or localhost</p>
     */
    private String hostname;

    /**
     * REST port used in SINGLE deployment mode.
     */
    private Integer port;

    /**
     * Master endpoints used in SEPARATED_CLUSTER deployment mode.
     *
     * <p>Master endpoints are used for activation, health probing, and runtime API routing.</p>
     */
    private List<SeaTunnelClientEndpoint> masterEndpoints;

    /**
     * Worker endpoints used in SEPARATED_CLUSTER deployment mode.
     *
     * <p>Worker endpoints are mainly used for topology display and health diagnostics.</p>
     */
    private List<SeaTunnelClientEndpoint> workerEndpoints;

    /**
     * Authentication information used to access SeaTunnel REST endpoints.
     */
    private SeaTunnelClientAuthInfo auth;

    /**
     * Context path for the application.
     */
    private String contextPath;
}
