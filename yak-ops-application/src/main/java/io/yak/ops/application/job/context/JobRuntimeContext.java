package io.yak.ops.application.job.context;

import io.yak.ops.application.model.dto.config.JobEnvConfig;
import io.yak.ops.application.model.dto.config.JobScheduleConfig;
import io.yak.ops.plugin.spi.enums.JobRuntimeType;
import lombok.Builder;
import lombok.Data;

/** Runtime settings shared by all job HOCON builders. */
@Data
@Builder
public class JobRuntimeContext {
    private JobRuntimeType runtimeType;
    private JobEnvConfig env;
    private JobScheduleConfig schedule;

    public boolean isBatch() {
        return JobRuntimeType.BATCH == runtimeType;
    }
}
