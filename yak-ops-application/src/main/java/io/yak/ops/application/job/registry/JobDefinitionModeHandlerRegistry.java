package io.yak.ops.application.job.registry;

import javax.annotation.Resource;
import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.application.job.handler.JobDefinitionModeHandler;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class JobDefinitionModeHandlerRegistry {

    @Resource
    private List<JobDefinitionModeHandler> handlers;

    public JobDefinitionModeHandler getHandler(JobDefinitionMode mode) {
        return handlers.stream()
                .filter(handler -> handler.supports(mode))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No suitable handler found for mode=" + mode));
    }
}
