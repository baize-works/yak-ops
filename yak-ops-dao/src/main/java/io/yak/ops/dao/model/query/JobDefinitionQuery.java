package io.yak.ops.dao.model.query;

import io.yak.ops.common.enums.SyncModeEnum;
import io.yak.ops.domain.enums.JobMode;
import lombok.Data;

import java.util.Date;

/** Persistence criteria for querying job definitions. */
@Data
public class JobDefinitionQuery {
    private Long id;
    private String sourceType;
    private String sinkType;
    private JobMode jobType;
    private SyncModeEnum syncMode;
    private Date createTimeStart;
    private Date createTimeEnd;
    private String jobName;
    private String status;
    private String sourceTable;
    private String scheduleConfig;
    private String sinkTable;
}
