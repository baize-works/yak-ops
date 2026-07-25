package io.baize.flow.application.job.handler.single;

import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.common.modal.JobDefinitionAnalysisResult;
import io.baize.flow.common.utils.JSONUtils;
import io.baize.flow.application.job.handler.JobDefinitionModeHandler;
import io.baize.flow.web.contract.dto.command.GuideSingleJobContentCommand;
import io.baize.flow.web.contract.dto.command.JobDefinitionSaveCommand;
import org.springframework.stereotype.Component;

@Component
public class GuideSingleJobDefinitionHandler implements JobDefinitionModeHandler {

    private final GuideSingleWorkflowValidator workflowValidator;
    private final GuideSingleWorkflowAnalyzer workflowAnalyzer;
    private final GuideSingleHoconBuildService hoconBuildService;

    public GuideSingleJobDefinitionHandler(
            GuideSingleWorkflowValidator workflowValidator,
            GuideSingleWorkflowAnalyzer workflowAnalyzer,
            GuideSingleHoconBuildService hoconBuildService) {
        this.workflowValidator = workflowValidator;
        this.workflowAnalyzer = workflowAnalyzer;
        this.hoconBuildService = hoconBuildService;
    }

    @Override
    public boolean supports(JobDefinitionMode mode) {
        return JobDefinitionMode.GUIDE_SINGLE == mode;
    }

    @Override
    public void validate(JobDefinitionSaveCommand command) {
        GuideSingleJobContentCommand cmd = cast(command);
        workflowValidator.validate(cmd.getWorkflow());
    }

    @Override
    public JobDefinitionAnalysisResult analyze(JobDefinitionSaveCommand command) {
        GuideSingleJobContentCommand cmd = cast(command);
        return workflowAnalyzer.analyze(cmd.getWorkflow());
    }

    @Override
    public String serializeDefinition(JobDefinitionSaveCommand command) {
        GuideSingleJobContentCommand cmd = cast(command);
        return JSONUtils.toJsonString(cmd.getWorkflow());
    }

    @Override
    public String buildHoconConfig(JobDefinitionSaveCommand command) {
        GuideSingleJobContentCommand cmd = cast(command);
        return hoconBuildService.build(cmd.getWorkflow(), command);
    }

    private GuideSingleJobContentCommand cast(JobDefinitionSaveCommand command) {
        if (!(command instanceof GuideSingleJobContentCommand)) {
            throw new IllegalArgumentException("command must implement GuideSingleJobContentCommand");
        }
        return (GuideSingleJobContentCommand) command;
    }
}
