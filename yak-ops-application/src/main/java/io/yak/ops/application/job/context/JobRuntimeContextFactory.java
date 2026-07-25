package io.yak.ops.application.job.context;

import io.yak.ops.application.model.dto.command.BatchJobSaveCommand;
import io.yak.ops.application.model.dto.command.JobDefinitionSaveCommand;
import org.springframework.stereotype.Component;

/** Creates the normalized runtime settings consumed by job builders. */
@Component
public class JobRuntimeContextFactory {
    public JobRuntimeContext create(JobDefinitionSaveCommand command) {
        if (command == null) {
            throw new IllegalArgumentException("command can not be null");
        }
        JobRuntimeContext.JobRuntimeContextBuilder builder = JobRuntimeContext.builder()
                .runtimeType(command.getRuntimeType())
                .env(command.getEnv());
        if (command instanceof BatchJobSaveCommand) {
            builder.schedule(((BatchJobSaveCommand) command).getSchedule());
        }
        return builder.build();
    }
}
