package io.baize.flow.application.job.handler.script;

import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.common.utils.JSONUtils;
import io.baize.flow.application.job.handler.BatchJobEditCommandBuilder;
import io.baize.flow.dao.entity.JobDefinitionContentEntity;
import io.baize.flow.dao.entity.JobDefinitionEntity;
import io.baize.flow.web.contract.dto.batch.BatchScriptJobSaveCommand;
import io.baize.flow.web.contract.dto.command.JobDefinitionSaveCommand;
import io.baize.flow.web.contract.dto.config.BatchJobEnvConfig;
import io.baize.flow.web.contract.dto.config.JobBasicConfig;
import io.baize.flow.web.contract.dto.config.JobScheduleConfig;
import io.baize.flow.web.contract.dto.config.ScriptJobContent;
import org.springframework.stereotype.Component;

@Component
public class BatchScriptEditCommandBuilder implements BatchJobEditCommandBuilder {

    @Override
    public JobDefinitionMode mode() {
        return JobDefinitionMode.SCRIPT;
    }

    @Override
    public JobDefinitionSaveCommand build(
            JobDefinitionEntity definition,
            JobDefinitionContentEntity contentEntity,
            JobScheduleConfig scheduleConfig) {

        BatchScriptJobSaveCommand cmd = new BatchScriptJobSaveCommand();
        cmd.setId(definition.getId());
        cmd.setBasic(buildBasicConfig(definition));
        cmd.setSchedule(scheduleConfig);
        cmd.setContent(JSONUtils.parseObject(contentEntity.getDefinitionContent(), ScriptJobContent.class));
        cmd.setEnv(JSONUtils.parseObject(contentEntity.getEnvConfig(), BatchJobEnvConfig.class));
        return cmd;
    }

    private JobBasicConfig buildBasicConfig(JobDefinitionEntity definition) {
        JobBasicConfig basic = new JobBasicConfig();
        basic.setMode(definition.getMode());
        basic.setJobName(definition.getJobName());
        basic.setJobDesc(definition.getJobDesc());
        basic.setClientId(definition.getClientId());
        return basic;
    }
}
