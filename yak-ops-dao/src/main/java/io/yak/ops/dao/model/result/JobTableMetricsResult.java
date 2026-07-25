package io.yak.ops.dao.model.result;

import lombok.Data;
import java.math.BigDecimal;
import java.util.Date;

/** Persistence projection for table-level job metrics. */
@Data
public class JobTableMetricsResult {
    private Long id; private Long jobInstanceId; private Long jobDefinitionId; private Integer pipelineId;
    private String sourceTable; private String sinkTable; private Long readRowCount; private Long writeRowCount;
    private BigDecimal readQps; private BigDecimal writeQps; private Long readBytes; private Long writeBytes;
    private BigDecimal readBps; private BigDecimal writeBps; private Long rowDiff; private String status;
    private String errorMsg; private Date createTime; private Date updateTime;
}
