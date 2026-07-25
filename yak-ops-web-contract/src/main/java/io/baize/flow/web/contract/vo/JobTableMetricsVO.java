package io.baize.flow.web.contract.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Date;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class JobTableMetricsVO {

    private Long id;

    private Long jobInstanceId;

    private Long jobDefinitionId;

    private Integer pipelineId;

    private String sourceTable;

    private String sinkTable;

    private Long readRowCount;

    private Long writeRowCount;

    private BigDecimal readQps;

    private BigDecimal writeQps;

    private Long readBytes;

    private Long writeBytes;

    private BigDecimal readBps;

    private BigDecimal writeBps;

    private Long rowDiff;

    private String status;

    private String errorMsg;

    private Date createTime;

    private Date updateTime;
}
