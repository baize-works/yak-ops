package io.yak.ops.application.model.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import io.yak.ops.domain.enums.JobMode;
import io.yak.ops.common.enums.SyncModeEnum;
import io.yak.ops.application.model.dto.pagination.PaginationBaseDTO;

@Data
@ToString
@EqualsAndHashCode(callSuper = true)
@Schema(description = "Base job definition command")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public abstract class BaseJobDefinitionCommand extends PaginationBaseDTO {

    @Schema(description = "Job definition ID", example = "1001")
    private Long id;

    @Schema(description = "Job name", example = "mysql_to_kafka_sync")
    private String jobName;

    @Schema(description = "Job description")
    private String jobDesc;

    @Schema(description = "Parallelism", example = "1")
    private Integer parallelism;

    @Schema(description = "Client ID", example = "10001")
    private Long clientId;

    @Schema(description = "Job version", example = "1")
    private Integer jobVersion;

    @Schema(description = "Job definition info in json")
    private String jobDefinitionInfo;

    @Schema(description = "Job type")
    private JobMode jobType;

    @Schema(description = "Sync mode")
    private SyncModeEnum syncMode;
}
