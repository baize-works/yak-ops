package io.baize.flow.web.contract.dto.command;


import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.web.contract.dto.config.JobBasicConfig;
import io.baize.flow.web.contract.dto.config.JobEnvConfig;
import io.baize.flow.plugin.spi.enums.JobRuntimeType;

/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public interface JobDefinitionSaveCommand {

    Long getId();

    JobDefinitionMode getMode();

    JobRuntimeType getRuntimeType();

    JobBasicConfig getBasic();

    JobEnvConfig getEnv();
}