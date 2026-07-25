package io.yak.ops.web.contract.dto.command;


import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.web.contract.dto.config.JobBasicConfig;
import io.yak.ops.web.contract.dto.config.JobEnvConfig;
import io.yak.ops.plugin.spi.enums.JobRuntimeType;

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
