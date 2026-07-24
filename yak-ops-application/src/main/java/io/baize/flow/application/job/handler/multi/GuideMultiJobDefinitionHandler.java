package io.baize.flow.application.job.handler.multi;

import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.common.modal.JobDefinitionAnalysisResult;
import io.baize.flow.common.utils.JSONUtils;
import io.baize.flow.application.job.handler.JobDefinitionModeHandler;
import io.baize.flow.web.contract.dto.command.GuideMultiJobContentCommand;
import io.baize.flow.web.contract.dto.command.JobDefinitionSaveCommand;
import io.baize.flow.web.contract.dto.config.GuideMultiJobContent;
import org.springframework.stereotype.Component;

@Component
public class GuideMultiJobDefinitionHandler implements JobDefinitionModeHandler {

    private final GuideMultiJobValidator validator;
    private final GuideMultiJobAnalyzer analyzer;
    private final GuideMultiHoconBuildService hoconBuildService;

    public GuideMultiJobDefinitionHandler(
            GuideMultiJobValidator validator,
            GuideMultiJobAnalyzer analyzer,
            GuideMultiHoconBuildService hoconBuildService) {
        this.validator = validator;
        this.analyzer = analyzer;
        this.hoconBuildService = hoconBuildService;
    }

    @Override
    public boolean supports(JobDefinitionMode mode) {
        return JobDefinitionMode.GUIDE_MULTI == mode;
    }

    @Override
    public void validate(JobDefinitionSaveCommand command) {
        GuideMultiJobContent content = cast(command).getContent();
        validator.validate(content);
    }

    @Override
    public JobDefinitionAnalysisResult analyze(JobDefinitionSaveCommand command) {
        GuideMultiJobContent content = cast(command).getContent();
        return analyzer.analyze(content);
    }

    @Override
    public String serializeDefinition(JobDefinitionSaveCommand command) {
        GuideMultiJobContent content = cast(command).getContent();
        return JSONUtils.toJsonString(content);
    }

    @Override
    public String buildHoconConfig(JobDefinitionSaveCommand command) {
        GuideMultiJobContent content = cast(command).getContent();
        return hoconBuildService.build(content, command);
    }

    private GuideMultiJobContentCommand cast(JobDefinitionSaveCommand command) {
        if (!(command instanceof GuideMultiJobContentCommand)) {
            throw new IllegalArgumentException("command must implement GuideMultiJobContentCommand");
        }
        return (GuideMultiJobContentCommand) command;
    }
}