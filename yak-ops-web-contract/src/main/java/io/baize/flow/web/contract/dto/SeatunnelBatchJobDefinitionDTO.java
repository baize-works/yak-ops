package io.baize.flow.web.contract.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import io.baize.flow.domain.enums.ScheduleStatusEnum;


@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
@Schema(description = "Batch job definition DTO")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class SeatunnelBatchJobDefinitionDTO extends BaseJobDefinitionCommand {

    @Schema(description = "Cron expression", example = "0 0 1 * * ?")
    private String cronExpression;

    @Schema(description = "Schedule status")
    private ScheduleStatusEnum scheduleStatus;

    @Schema(description = "Schedule config json")
    private String scheduleConfig;
}