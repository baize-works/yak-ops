package io.yak.ops.dao.model.result;

import io.yak.ops.common.enums.*;
import io.yak.ops.domain.enums.JobMode;
import io.yak.ops.domain.enums.RunMode;
import lombok.Data;
import java.util.Date;

/** Joined persistence projection for a job definition and its latest execution. */
@Data
public class JobDefinitionResult {
    private Long id; private Long instanceId; private String jobName; private String jobDesc;
    private JobDefinitionMode mode; private JobMode jobType; private ReleaseState releaseState;
    private Long clientId; private Integer parallelism; private Long duration; private Long qps;
    private String jobDefinitionInfo; private Integer jobVersion; private String sourceType;
    private String sourceTable; private SyncModeEnum syncMode; private String sinkType; private String sinkTable;
    private String lastJobStatus; private Date lastStartTime; private Date lastEndTime; private String errorMessage;
    private RunMode runMode; private Long readRowCount; private Long writeRowCount; private Long readQps;
    private Long writeQps; private Long recordDelay; private Date createTime; private Date updateTime;
    private String scheduleId; private String cronExpression; private ScheduleStatusEnum scheduleStatus;
    private Date lastScheduleTime; private Date nextScheduleTime; private String scheduleConfig;
    private Long sourceDatasourceId; private Long sinkDatasourceId; private String sourceDatasourceName;
    private String sinkDatasourceName;
}
