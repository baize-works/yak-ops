package io.baize.flow.application.job.registry;

import jakarta.annotation.Resource;
import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.application.job.handler.JobDefinitionModeHandler;
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