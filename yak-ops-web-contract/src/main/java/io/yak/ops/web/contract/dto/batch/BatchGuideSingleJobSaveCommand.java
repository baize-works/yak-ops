package io.yak.ops.web.contract.dto.batch;

import lombok.Data;
import lombok.EqualsAndHashCode;
import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.web.contract.dto.command.BatchJobSaveCommand;
import io.yak.ops.web.contract.dto.command.GuideSingleJobContentCommand;
import io.yak.ops.web.contract.dto.config.BatchJobEnvConfig;
import io.yak.ops.web.contract.dto.config.JobBasicConfig;
import io.yak.ops.web.contract.dto.config.JobScheduleConfig;

import java.util.Map;

@Data
@EqualsAndHashCode(callSuper = false)
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
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
