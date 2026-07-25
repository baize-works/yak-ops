package io.baize.flow.application.support.hocon;

import io.baize.flow.web.contract.dto.command.JobDefinitionSaveCommand;

/**
 * Build executable hocon config from job definition command.
 */
public interface JobDefinitionHoconBuilder {

    /**
     * Build hocon config for the given job definition command.
     *
     * @param command job definition command
     * @return executable hocon config
     */
    String build(JobDefinitionSaveCommand command);
}
