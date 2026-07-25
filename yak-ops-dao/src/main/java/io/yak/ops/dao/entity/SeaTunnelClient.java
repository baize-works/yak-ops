package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import io.yak.ops.web.contract.dto.SeaTunnelClientEndpointDTO;

import java.util.Date;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@TableName("t_baize_flow_client")
public class SeaTunnelClient {

    private Long id;

    private String clientName;

    private String engineType;

    private String deployMode;

    private String protocol;

    private String baseUrl;

    private String contextPath;

    private Long activeMasterNodeId;

    private Integer healthStatus;

    private Date heartbeatTime;

    private String clientVersion;

    private String clientAddress;

    private String clientPort;

    private Boolean authEnabled;

    private String username;

    private String password;

    private String remark;

    private String lastError;

    private Date createTime;

    private Date updateTime;

    @TableField(exist = false)
    private List<SeaTunnelClientEndpointDTO> masterEndpoints;

    @TableField(exist = false)
    private List<SeaTunnelClientEndpointDTO> workerEndpoints;
}
