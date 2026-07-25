package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.yak.ops.domain.job.JobExecutionStatus;
import java.util.Date;
import lombok.Data;

@Data
@TableName("job_execution")
public class JobExecutionEntity {
    @TableId(type = IdType.AUTO) private Long id;
    private Long instanceId; private Integer attemptNo; private String engineType; private Long engineEndpointId;
    private String externalJobId; private JobExecutionStatus submissionStatus; private JobExecutionStatus executionStatus;
    private Date submittingAt; private Date submittedAt; private Date startedAt; private Date cancellingAt; private Date canceledAt;
    private Date finishedAt; private Date lastSyncedAt; private String errorCode; private String errorMessage; private String engineSnapshot;
    private String createdBy; private String updatedBy; private Date createTime; private Date updateTime;
}
