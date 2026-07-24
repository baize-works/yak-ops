package io.baize.flow.application.job.handler.script;

import com.typesafe.config.Config;
import jakarta.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.common.modal.JobDefinitionAnalysisResult;
import io.baize.flow.common.utils.JSONUtils;
import io.baize.flow.application.job.handler.JobDefinitionModeHandler;
import io.baize.flow.web.contract.dto.command.JobDefinitionSaveCommand;
import io.baize.flow.web.contract.dto.command.ScriptJobContentCommand;
import io.baize.flow.web.contract.dto.config.ScriptJobContent;
import org.springframework.stereotype.Component;

@Component
public class ScriptJobDefinitionHandler implements JobDefinitionModeHandler {

    @Resource
    private ScriptJobDefinitionParser scriptJobDefinitionParser;

    @Resource
    private ScriptHoconBuildService scriptHoconBuildService;

    @Override
    public boolean supports(JobDefinitionMode mode) {
        return JobDefinitionMode.SCRIPT == mode;
    }

    @Override
    public void validate(JobDefinitionSaveCommand command) {
        ScriptJobContentCommand cmd = cast(command);

        ScriptJobContent content = cmd.getContent();
        if (content == null) {
            throw new IllegalArgumentException("content can not be null");
        }
        if (StringUtils.isBlank(content.getHoconContent())) {
            throw new IllegalArgumentException("hoconContent can not be blank");
        }

        Config config = scriptJobDefinitionParser.parseAndValidate(content.getHoconContent());

        if (!config.hasPath("source")) {
            throw new IllegalArgumentException("hocon source can not be empty");
        }
        if (!config.hasPath("sink")) {
            throw new IllegalArgumentException("hocon sink can not be empty");
        }
    }

    @Override
    public JobDefinitionAnalysisResult analyze(JobDefinitionSaveCommand command) {
        ScriptJobContentCommand cmd = cast(command);
        return scriptJobDefinitionParser.analyze(cmd.getContent().getHoconContent());
    }

    @Override
    public String serializeDefinition(JobDefinitionSaveCommand command) {
        ScriptJobContentCommand cmd = cast(command);
        return JSONUtils.toJsonString(cmd.getContent());
    }

    @Override
    public String buildHoconConfig(JobDefinitionSaveCommand command) {
        ScriptJobContentCommand cmd = cast(command);
        return scriptHoconBuildService.build(cmd.getContent(), command);
    }

    private ScriptJobContentCommand cast(JobDefinitionSaveCommand command) {
        if (!(command instanceof ScriptJobContentCommand)) {
            throw new IllegalArgumentException("command must implement ScriptJobContentCommand");
        }
        return (ScriptJobContentCommand) command;
    }
}