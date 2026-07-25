package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Date;

/**
 * LinkUp table level metrics.
 */
@Data
@TableName("t_yak_ops_job_table_metrics")
public class JobTableMetrics {

    @TableId(value = "id", type = IdType.INPUT)
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

    private String status;

    private String errorMsg;

    private Date createTime;

    private Date updateTime;
}
