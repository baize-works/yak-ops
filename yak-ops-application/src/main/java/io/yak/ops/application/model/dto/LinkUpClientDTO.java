package io.yak.ops.application.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class LinkUpClientDTO {

    private Long id;

    private String clientName;

    private String engineType;

    /**
     * SINGLE / SEPARATED_CLUSTER
     */
    private String deployMode;

    /**
     * http / https
     */
    private String protocol;

    /**
     * SINGLE 模式使用。
     */
    private String clientAddress;

    private String clientHostname;

    private String clientPort;

    /**
     * 分离模式 Master REST 地址。
     */
    private List<LinkUpClientEndpointDTO> masterEndpoints;

    /**
     * 预留 Worker 节点。
     * 前端暂时不传也没关系。
     */
    private List<LinkUpClientEndpointDTO> workerEndpoints;

    private String remark;

    private String contextPath;

    private Boolean authEnabled;

    private String username;

    private String password;
}
