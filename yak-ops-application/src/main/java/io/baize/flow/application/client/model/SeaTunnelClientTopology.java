package io.baize.flow.application.client.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Runtime topology model of a SeaTunnel client.
 *
 * <p>This model describes how a SeaTunnel client is deployed and which endpoints
 * are available as master or worker nodes.</p>
 *
 * <p>It is mainly used during client activation, node probing, and runtime route
 * selection.</p>
 */
@Data
@Builder
public class SeaTunnelClientTopology {

    /**
     * Client deployment mode.
     *
     * <p>Typical values are SINGLE and SEPARATED_CLUSTER.</p>
     */
    private String deployMode;

    /**
     * Master endpoints of the SeaTunnel client.
     *
     * <p>Master nodes are used as runtime entry points for REST API calls.</p>
     */
    private List<SeaTunnelClientEndpoint> masters;

    /**
     * Worker endpoints of the SeaTunnel client.
     *
     * <p>Worker nodes are mainly used for topology display and health diagnostics.</p>
     */
    private List<SeaTunnelClientEndpoint> workers;

    /**
     * Returns whether the topology contains at least one master endpoint.
     *
     * @return true if master endpoint exists, otherwise false
     */
    public boolean hasMaster() {
        return masters != null && !masters.isEmpty();
    }
}