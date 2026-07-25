package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@AllArgsConstructor
@NoArgsConstructor
@TableName("t_baize_flow_client_node")
public class SeaTunnelClientNode {

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long clientId;

    /**
     * MASTER / WORKER
     */
    private String nodeRole;

    private String nodeName;

    private String host;

    private String hostname;

    private Integer port;

    private String baseUrl;

    private Boolean activeMaster;

    private Integer healthStatus;

    private String clientVersion;

    private Date lastHeartbeatTime;

    private String lastError;

    private Date createTime;

    private Date updateTime;
}
