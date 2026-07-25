package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_yak_ops_connector_param_meta")
public class ConnectorParamMetaEntity extends BaseEntity implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    private String type;

    private String connectorName;

    private String connectorType;

    private String paramName;

    private String paramDesc;

    private String paramType;

    private Integer requiredFlag;

    private String defaultValue;

    private String exampleValue;

    private String paramContext;

    private String remark;

    @TableLogic
    private Integer deleted;
}
