package io.yak.ops.application.model.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import io.yak.ops.domain.enums.ScheduleStatusEnum;


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
public class SeatunnelBatchJobDefinitionDTO extends BaseJobDefinitionCommand {

    @Schema(description = "Cron expression", example = "0 0 1 * * ?")
    private String cronExpression;

    @Schema(description = "Schedule status")
    private ScheduleStatusEnum scheduleStatus;

    @Schema(description = "Schedule config json")
    private String scheduleConfig;
}
