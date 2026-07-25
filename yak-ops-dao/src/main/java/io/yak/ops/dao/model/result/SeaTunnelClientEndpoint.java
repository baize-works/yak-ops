package io.yak.ops.dao.model.result;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Non-persistent endpoint view attached to a persisted client. */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SeaTunnelClientEndpoint {
    private Long id; private String host; private String hostname; private Integer port;
    private String role; private String healthStatus; private Boolean activeMaster;
    private String baseUrl; private String lastError;
}
