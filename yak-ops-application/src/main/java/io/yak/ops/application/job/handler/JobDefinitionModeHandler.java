package io.yak.ops.application.job.handler;

import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.common.modal.JobDefinitionAnalysisResult;
import io.yak.ops.application.model.dto.command.JobDefinitionSaveCommand;

public interface JobDefinitionModeHandler {

    /**
     * Match only by job definition mode:
     * SCRIPT / GUIDE_SINGLE / GUIDE_MULTI
     */
    boolean supports(JobDefinitionMode mode);

    /**
     * Validate the definition content for the current mode.
     */
    void validate(JobDefinitionSaveCommand command);

    /**
     * Analyze summary information such as source/sink type,
     * table name, datasource ID, and other metadata.
     */
    JobDefinitionAnalysisResult analyze(JobDefinitionSaveCommand command);

    /**
     * Serialize the job definition content.
     *
     * SCRIPT       -> ScriptJobContent JSON
     * GUIDE_SINGLE -> workflow JSON
     * GUIDE_MULTI  -> GuideMultiJobContent JSON
     */
    String serializeDefinition(JobDefinitionSaveCommand command);

    /**
     * Build the LinkUp HOCON configuration.
     */
    String buildHoconConfig(JobDefinitionSaveCommand command);
}
