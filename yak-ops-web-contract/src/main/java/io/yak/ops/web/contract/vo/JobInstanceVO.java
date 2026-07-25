package io.yak.ops.web.contract.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class JobInstanceVO {

    private Long id;

    private Long jobDefinitionId;

    private Long clientId;

    private String checkpointPath;

    private String savepointPath;

    private String runMode;

    private String jobStatus;

    private String triggerSource;

    private Integer retryCount;

    private String engineJobId;

    private String runtimeConfig;

    private String logPath;

    private String errorMessage;

    private Date submitTime;

    private Date startTime;

    private Date endTime;

    private Date createTime;

    private Date updateTime;

    private String jobName;

    private String jobDesc;

    private String definitionMode;

    private String jobType;

    private Long definitionClientId;

    private Integer parallelism;

    private Integer jobVersion;

    private String definitionStatus;

    private String sourceType;

    private String sinkType;

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

    private Long intermediateQueueSize;

    private Long lagCount;

    private BigDecimal lossRate;

    private Long avgRowSize;

    private Long recordDelay;

    private String cronExpression;

    private String scheduleStatus;

    private String scheduleConfig;

    private Date lastScheduleTime;

    private Long sourceDatasourceId;

    private Long sinkDatasourceId;

    private Date nextScheduleTime;

    /**
     * Table level metrics.
     *
     * <p>
     * Single table mode: usually one record.
     * Multi table mode: one record per source/sink table pair.
     * </p>
     */
    private List<JobTableMetricsVO> tableMetrics;
}
