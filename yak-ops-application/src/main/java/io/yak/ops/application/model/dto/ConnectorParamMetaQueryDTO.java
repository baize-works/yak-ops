package io.yak.ops.application.model.dto;

import lombok.Data;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class ConnectorParamMetaQueryDTO {

    /**
     * 参数类型，如 connector/time
     */
    private String type;

    /**
     * 连接器名称
     */
    private String connectorName;
    private String connectorType;

    /**
     * 参数名，支持模糊查询
     */
    private String paramName;

    /**
     * 当前页
     */
    private Long pageNum = 1L;

    /**
     * 每页大小
     */
    private Long pageSize = 10L;
}
