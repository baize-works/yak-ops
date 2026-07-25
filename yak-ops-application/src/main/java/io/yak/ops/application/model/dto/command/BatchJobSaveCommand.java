package io.yak.ops.application.model.dto.command;

import io.yak.ops.application.model.dto.config.JobScheduleConfig;
import io.yak.ops.plugin.spi.enums.JobRuntimeType;

/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public interface BatchJobSaveCommand extends JobDefinitionSaveCommand {

    JobScheduleConfig getSchedule();

    @Override
    default JobRuntimeType getRuntimeType() {
        return JobRuntimeType.BATCH;
    }
}
