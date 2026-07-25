package io.yak.ops.application.model.dto.command;


import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.application.model.dto.config.JobBasicConfig;
import io.yak.ops.application.model.dto.config.JobEnvConfig;
import io.yak.ops.plugin.spi.enums.JobRuntimeType;

/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public interface JobDefinitionSaveCommand {

    Long getId();

    JobDefinitionMode getMode();

    JobRuntimeType getRuntimeType();

    JobBasicConfig getBasic();

    JobEnvConfig getEnv();
}
