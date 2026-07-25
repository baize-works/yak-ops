package io.yak.ops.application.client.model;

import lombok.Builder;
import lombok.Data;

/**
 * Runtime endpoint model of a SeaTunnel client node.
 *
 * <p>This model represents one accessible SeaTunnel REST endpoint. It can be a
 * master node or a worker node, depending on the node role.</p>
 *
 * <p>Master endpoints are usually used for runtime API routing, while worker
 * endpoints are mainly used for topology display and health diagnostics.</p>
 */
@Data
@Builder
public class SeaTunnelClientEndpoint {

    /**
     * Endpoint id.
     *
     * <p>This value usually maps to the persisted client node id. It may be null
     * before the endpoint is saved.</p>
     */
    private Long id;

    /**
     * Endpoint role.
     *
     * <p>Typical values are MASTER and WORKER.</p>
     */
    private String role;

    /**
     * Endpoint host.
     *
     * <p>For example: 127.0.0.1 or seatunnel-master-1.</p>
     */
    private String host;

    /**
     * Hostname of the server.
     * <p>For example: node1 or localhost</p>
     */
    private String hostname;

    /**
     * Endpoint REST port.
     */
    private Integer port;

    /**
     * Endpoint protocol.
     *
     * <p>Typical values are http and https.</p>
     */
    private String protocol;

    /**
     * Full base URL of the endpoint.
     *
     * <p>For example: http://127.0.0.1:5801.</p>
     */
    private String baseUrl;

    /**
     * Context path for the application.
     */
    private String contextPath;

    /**
     * Whether this endpoint is the currently selected active master.
     *
     * <p>This field is only meaningful for master endpoints.</p>
     */
    private Boolean activeMaster;

    /**
     * Endpoint health status.
     *
     * <p>Typical values are LIVE, DEAD, and UNKNOWN.</p>
     */
    private String healthStatus;

    /**
     * SeaTunnel client version resolved from this endpoint.
     *
     * <p>This value is usually available after a successful probe.</p>
     */
    private String clientVersion;

    /**
     * Last error message of this endpoint.
     *
     * <p>This field is mainly used for connection failure diagnostics.</p>
     */
    private String lastError;
}
