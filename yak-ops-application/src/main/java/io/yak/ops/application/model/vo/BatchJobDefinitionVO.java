package io.yak.ops.application.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import io.yak.ops.common.enums.*;

import java.util.Date;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class BatchJobDefinitionVO {

    private Long id;

    private Long instanceId;

    private String jobName;

    private String jobDesc;

    /**
     * SCRIPT / GUIDE_SINGLE / GUIDE_MULTI
     */
    private JobDefinitionMode mode;

    /**
     * BATCH
     */
    private JobMode jobType;

    private ReleaseState releaseState;

    private Long clientId;

    private Integer parallelism;

    private Long duration;

    private Long qps;

    private String jobDefinitionInfo;

    private Integer jobVersion;

    private String sourceType;
    private String sourceTable;

    private SyncModeEnum syncMode;

    private String sinkType;
    private String sinkTable;

    private String lastJobStatus;
    private Date lastStartTime;
    private Date lastEndTime;
    private String errorMessage;
    private RunMode runMode;

    private Long readRowCount;
    private Long writeRowCount;
    private Long readQps;
    private Long writeQps;
    private Long recordDelay;

    @JsonFormat(pattern = "yyyy/MM/dd HH:mm:ss", timezone = "GMT+8")
    private Date createTime;

    @JsonFormat(pattern = "yyyy/MM/dd HH:mm:ss", timezone = "GMT+8")
    private Date updateTime;

    private String scheduleId;
    private String cronExpression;
    private ScheduleStatusEnum scheduleStatus;

    @JsonFormat(pattern = "yyyy/MM/dd HH:mm:ss", timezone = "GMT+8")
    private Date lastScheduleTime;

    @JsonFormat(pattern = "yyyy/MM/dd HH:mm:ss", timezone = "GMT+8")
    private Date nextScheduleTime;

    private String scheduleConfig;

    private Long sourceDatasourceId;
    private Long sinkDatasourceId;

    private String sourceDatasourceName;
    private String sinkDatasourceName;
}
