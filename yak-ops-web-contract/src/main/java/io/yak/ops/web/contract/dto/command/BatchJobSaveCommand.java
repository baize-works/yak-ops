package io.yak.ops.web.contract.dto.command;

import io.yak.ops.web.contract.dto.config.JobScheduleConfig;
import io.yak.ops.plugin.spi.enums.JobRuntimeType;

/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public interface BatchJobSaveCommand extends JobDefinitionSaveCommand {

    JobScheduleConfig getSchedule();

    @Override
    default JobRuntimeType getRuntimeType() {
        return JobRuntimeType.BATCH;
    }
}
