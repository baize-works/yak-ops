package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.*;
import io.yak.ops.domain.enums.JobMode;
import io.yak.ops.domain.enums.JobStatus;
import io.yak.ops.domain.enums.RunMode;

import java.util.Date;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
@TableName("t_baize_flow_job_instance")
public class JobInstance {

    @TableId(type = IdType.INPUT)
    private Long id;

    /**
     * Associated job definition id
     */
    private Long jobDefinitionId;

    /**
     * Run mode, such as MANUAL / SCHEDULE / RETRY
     */
    private RunMode runMode;

    /**
     * Job mode, such as BATCH
     */
    private JobMode jobMode;

    /**
     * Current job execution status
     */
    private JobStatus jobStatus;

    /**
     * Trigger source description
     */
    private String triggerSource;

    /**
     * Retry count of current instance
     */
    private Integer retryCount;

    private Long clientId;

    /**
     * Engine-side job id
     */
    private String engineJobId;

    /**
     * Runtime config used by this execution
     */
    private String runtimeConfig;

    /**
     * Log file path
     */
    private String logPath;

    /**
     * Error summary message
     */
    private String errorMessage;

    /**
     * Submit time to engine
     */
    private Date submitTime;

    /**
     * Actual start time
     */
    private Date startTime;

    /**
     * Finish time
     */
    private Date endTime;

    private Date createTime;

    private Date updateTime;
}
