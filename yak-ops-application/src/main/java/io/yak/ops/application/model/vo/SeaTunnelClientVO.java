package io.yak.ops.application.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@AllArgsConstructor
@NoArgsConstructor
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class SeaTunnelClientVO {
    private Long id;
    private String clientName;
    private String engineType;
    private String baseUrl;
    private String contextPath;
    private Integer clientStatus;
    private String clientStatusName;
    private Integer healthStatus;
    private String healthStatusName;
    private Date heartbeatTime;
    private String version;
    private String containerId;
    private String clientAddress;
    private String remark;
    private Date createTime;
    private Date updateTime;
}
