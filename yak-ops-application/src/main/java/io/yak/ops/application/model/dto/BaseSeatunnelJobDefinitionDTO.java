package io.yak.ops.application.model.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import io.yak.ops.domain.enums.ScheduleStatusEnum;
import io.yak.ops.application.model.dto.pagination.PaginationBaseDTO;

import java.util.Date;


@Data
@ToString
@EqualsAndHashCode(callSuper = true)
@Schema(description = "Base job definition DTO containing common fields for all job types")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public abstract class BaseSeatunnelJobDefinitionDTO extends PaginationBaseDTO {

    @Schema(
            description = "Job definition ID (auto-generated)",
            example = "1001",
            accessMode = Schema.AccessMode.READ_ONLY
    )
    private Long id;

    /**
     * Job name
     */
    @Schema(
            description = "Job name",
            requiredMode = Schema.RequiredMode.REQUIRED,
            example = "MySQL to Hive daily sync"
    )
    private String jobName;

    /**
     * Job description
     */
    @Schema(
            description = "Job description",
            example = "Synchronizes user data from MySQL to Hive every day at 2 AM",
            nullable = true
    )
    private String jobDesc;

    @Schema(
            description = "Job type (BATCH)",
            example = "BATCH",
            allowableValues = {"BATCH"},
            accessMode = Schema.AccessMode.READ_ONLY
    )
    private String jobType;

    /**
     * Job parallelism
     */
    @Schema(
            description = "Job parallelism (number of parallel tasks)",
            example = "1",
            defaultValue = "1",
            minimum = "1",
            maximum = "1000"
    )
    private int parallelism;

    /**
     * Schedule status
     */
    @Schema(
            description = "Schedule status",
            example = "NORMAL",
            allowableValues = {"NORMAL", "PAUSED", "COMPLETE", "ERROR", "BLOCKED", "NONE"}
    )
    private ScheduleStatusEnum scheduleStatus;

    /**
     * Job version number
     */
    @Schema(
            description = "Job version number (incremented on each update)",
            example = "1",
            defaultValue = "1"
    )
    private Integer jobVersion;

    /**
     * Client ID
     */
    @Schema(
            description = "Client ID (owner of the job)",
            example = "10001"
    )
    private Long clientId;

    /**
     * Source type
     */
    @Schema(
            description = "Source data type",
            example = "MYSQL",
            allowableValues = {"MYSQL", "POSTGRE_SQL", "KINGBASE", "DAMENG", "ORACLE", "KAFKA", "FILE", "HIVE", "ELASTICSEARCH"}
    )
    private String sourceType;

    /**
     * Sink type
     */
    @Schema(
            description = "Sink data type",
            example = "HIVE",
            allowableValues = {"HIVE", "MYSQL", "POSTGRE_SQL", "KINGBASE", "DAMENG", "ORACLE", "KAFKA", "FILE", "ELASTICSEARCH"}
    )
    private String sinkType;

    /**
     * Creation time
     */
    @Schema(
            description = "Creation time",
            example = "2024-01-01 10:00:00",
            accessMode = Schema.AccessMode.READ_ONLY
    )
    private Date createTime;

    /**
     * Update time
     */
    @Schema(
            description = "Last update time",
            example = "2024-01-02 15:30:00",
            accessMode = Schema.AccessMode.READ_ONLY
    )
    private Date updateTime;

    /**
     * Get job definition details
     * Implemented by subclasses to return job-specific configuration
     *
     * @return Job definition configuration string
     */
    @Schema(
            description = "Job definition configuration (implemented by subclasses)",
            hidden = true
    )
    public abstract String getJobDefinitionInfo();

    /**
     * Get job type
     *
     * @return "BATCH"
     */
    @Schema(
            description = "Job type",
            allowableValues = {"BATCH"}
    )
    public abstract String getJobType();
}
