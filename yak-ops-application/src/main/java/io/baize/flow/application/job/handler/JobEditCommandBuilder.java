package io.baize.flow.application.job.handler;

import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.web.contract.dto.command.JobDefinitionSaveCommand;
import io.baize.flow.plugin.spi.enums.JobRuntimeType;

public interface JobEditCommandBuilder<D, C> {

    JobRuntimeType runtimeType();

    JobDefinitionMode mode();

    JobDefinitionSaveCommand build(D definition, C content, Object runtimeConfig);
}
