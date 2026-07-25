package io.yak.ops.dao.model.query;

import io.yak.ops.domain.enums.JobMode;
import io.yak.ops.domain.enums.RunMode;
import lombok.Data;

import java.util.Date;

/** Persistence criteria for querying job instances. */
@Data
public class JobInstanceQuery {
    private Long id;
    private Long jobDefinitionId;
    private String keyword;
    private String jobStatus;
    private Date queryStartTime;
    private Date queryEndTime;
    private RunMode runMode;
    private JobMode jobType;
    private Integer pageNo = 1;
    private Integer pageSize = 10;
}
