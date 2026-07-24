package io.baize.flow.application.job.registry;

import jakarta.annotation.Resource;
import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.application.job.handler.BatchJobEditCommandBuilder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class BatchJobEditCommandBuilderRegistry {

    @Resource
    private List<BatchJobEditCommandBuilder> builders;

    public BatchJobEditCommandBuilder getBuilder(JobDefinitionMode mode) {
        return builders.stream()
                .filter(builder -> builder.mode() == mode)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No batch edit command builder found for mode=" + mode));
    }
}