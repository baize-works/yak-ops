package io.yak.ops.application.support.hocon;


import io.yak.ops.application.model.dto.command.JobDefinitionSaveCommand;

/**
 * Resolve persisted job definition into executable save command.
 */
public interface JobDefinitionCommandResolver {

    /**
     * Resolve latest definition command by definition id.
     *
     * @param jobDefinitionId definition id
     * @return resolved save command
     */
    JobDefinitionSaveCommand resolve(Long jobDefinitionId);
}
