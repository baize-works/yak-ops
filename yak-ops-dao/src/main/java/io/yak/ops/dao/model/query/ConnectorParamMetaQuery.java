package io.yak.ops.dao.model.query;

import lombok.Data;

/** Persistence pagination criteria for connector parameter metadata. */
@Data
public class ConnectorParamMetaQuery {
    private String type;
    private String connectorName;
    private String connectorType;
    private String paramName;
    private Long pageNum = 1L;
    private Long pageSize = 10L;
}
