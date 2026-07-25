package io.yak.ops.application.job.handler.script;

import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.application.job.handler.BatchJobEditCommandBuilder;
import io.yak.ops.dao.entity.JobDefinitionContentEntity;
import io.yak.ops.dao.entity.JobDefinitionEntity;
import io.yak.ops.web.contract.dto.batch.BatchScriptJobSaveCommand;
import io.yak.ops.web.contract.dto.command.JobDefinitionSaveCommand;
import io.yak.ops.web.contract.dto.config.BatchJobEnvConfig;
import io.yak.ops.web.contract.dto.config.JobBasicConfig;
import io.yak.ops.web.contract.dto.config.JobScheduleConfig;
import io.yak.ops.web.contract.dto.config.ScriptJobContent;
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
