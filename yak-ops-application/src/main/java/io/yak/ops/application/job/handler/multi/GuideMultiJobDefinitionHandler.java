package io.yak.ops.application.job.handler.multi;

import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.common.modal.JobDefinitionAnalysisResult;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.application.job.handler.JobDefinitionModeHandler;
import io.yak.ops.web.contract.dto.command.GuideMultiJobContentCommand;
import io.yak.ops.web.contract.dto.command.JobDefinitionSaveCommand;
import io.yak.ops.web.contract.dto.config.GuideMultiJobContent;
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
