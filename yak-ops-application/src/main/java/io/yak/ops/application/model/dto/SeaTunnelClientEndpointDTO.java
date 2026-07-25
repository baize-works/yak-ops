package io.yak.ops.application.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class SeaTunnelClientEndpointDTO {

    private Long id;

    private String host;

    private String hostname;

    private Integer port;

    /**
     * MASTER / WORKER
     */
    private String role;

    private String healthStatus;

    private Boolean activeMaster;

    private String baseUrl;

    private String lastError;
}
