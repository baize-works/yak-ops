package io.yak.ops.application.job.handler;

import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.application.model.dto.command.JobDefinitionSaveCommand;
import io.yak.ops.plugin.spi.enums.JobRuntimeType;

public interface JobEditCommandBuilder<D, C> {

    JobRuntimeType runtimeType();

    JobDefinitionMode mode();

    JobDefinitionSaveCommand build(D definition, C content, Object runtimeConfig);
}
