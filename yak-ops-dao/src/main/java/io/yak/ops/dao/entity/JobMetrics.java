package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Date;

/**
 * SeaTunnel job / pipeline level metrics.
 */
@Data
@TableName("t_yak_ops_job_metrics")
public class JobMetrics {

    private Long id;

    private Long jobInstanceId;

    private Long jobDefinitionId;

    private Integer pipelineId;

    private Long readRowCount;

    private Long writeRowCount;

    private BigDecimal readQps;

    private BigDecimal writeQps;

    private Long readBytes;

    private Long writeBytes;

    private BigDecimal readBps;

    private BigDecimal writeBps;

    private Long intermediateQueueSize;

    private Long lagCount;

    private BigDecimal lossRate;

    private Long avgRowSize;

    private Long recordDelay;

    private Date createTime;

    private Date updateTime;
}
