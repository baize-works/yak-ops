package io.yak.ops.application.model.dto.batch;

import lombok.Data;
import lombok.EqualsAndHashCode;
import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.application.model.dto.command.BatchJobSaveCommand;
import io.yak.ops.application.model.dto.command.GuideSingleJobContentCommand;
import io.yak.ops.application.model.dto.config.BatchJobEnvConfig;
import io.yak.ops.application.model.dto.config.JobBasicConfig;
import io.yak.ops.application.model.dto.config.JobScheduleConfig;

import java.util.Map;

@Data
@EqualsAndHashCode(callSuper = false)
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class BatchGuideSingleJobSaveCommand implements BatchJobSaveCommand, GuideSingleJobContentCommand {

    private Long id;

    private JobBasicConfig basic;

    private Map<String, Object> workflow;

    private JobScheduleConfig schedule;

    private BatchJobEnvConfig env;

    @Override
    public JobDefinitionMode getMode() {
        return JobDefinitionMode.GUIDE_SINGLE;
    }
}
