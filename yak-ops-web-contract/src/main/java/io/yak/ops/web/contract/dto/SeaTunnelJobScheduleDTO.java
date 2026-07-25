package io.yak.ops.web.contract.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import io.yak.ops.domain.enums.ScheduleStatusEnum;
import io.yak.ops.web.contract.dto.config.JobScheduleConfig;
import io.yak.ops.web.contract.dto.pagination.PaginationBaseDTO;

import java.sql.Date;


@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "Job schedule DTO")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class SeaTunnelJobScheduleDTO extends PaginationBaseDTO {


    private Long id;


    private Long jobDefinitionId;


    private String cronExpression;


    private ScheduleStatusEnum scheduleStatus;


    private Date lastScheduleTime;


    private Date nextScheduleTime;


    private JobScheduleConfig scheduleConfig;

}
