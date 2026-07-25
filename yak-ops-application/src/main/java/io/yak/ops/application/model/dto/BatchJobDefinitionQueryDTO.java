package io.yak.ops.application.model.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import io.yak.ops.domain.enums.JobMode;
import io.yak.ops.common.enums.SyncModeEnum;
import io.yak.ops.application.model.dto.pagination.PaginationBaseDTO;

import java.util.Date;


@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
@Schema(description = "Batch job definition DTO")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class BatchJobDefinitionQueryDTO extends PaginationBaseDTO {

    private Long id;

    private String sourceType;

    private String sinkType;

    private JobMode jobType;

    private SyncModeEnum syncMode;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createTimeStart;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createTimeEnd;

    private String jobName;

    private String status;

    private String sourceTable;

    private String scheduleConfig;

    private String sinkTable;

}
