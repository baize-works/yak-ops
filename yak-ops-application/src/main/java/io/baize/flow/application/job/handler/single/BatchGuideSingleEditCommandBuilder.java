package io.baize.flow.application.job.handler.single;

import com.fasterxml.jackson.core.type.TypeReference;
import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.common.utils.JSONUtils;
import io.baize.flow.application.job.handler.BatchJobEditCommandBuilder;
import io.baize.flow.dao.entity.JobDefinitionContentEntity;
import io.baize.flow.dao.entity.JobDefinitionEntity;
import io.baize.flow.web.contract.dto.batch.BatchGuideSingleJobSaveCommand;
import io.baize.flow.web.contract.dto.command.JobDefinitionSaveCommand;
import io.baize.flow.web.contract.dto.config.BatchJobEnvConfig;
import io.baize.flow.web.contract.dto.config.JobBasicConfig;
import io.baize.flow.web.contract.dto.config.JobScheduleConfig;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Map;

@Component
public class BatchGuideSingleEditCommandBuilder implements BatchJobEditCommandBuilder {

    @Override
    public JobDefinitionMode mode() {
        return JobDefinitionMode.GUIDE_SINGLE;
    }

    @Override
    public JobDefinitionSaveCommand build(
            JobDefinitionEntity definition,
            JobDefinitionContentEntity contentEntity,
            JobScheduleConfig scheduleConfig) {

        BatchGuideSingleJobSaveCommand cmd = new BatchGuideSingleJobSaveCommand();
        cmd.setId(definition.getId());
        cmd.setBasic(buildBasicConfig(definition));
        cmd.setSchedule(scheduleConfig);
        cmd.setEnv(JSONUtils.parseObject(contentEntity.getEnvConfig(), BatchJobEnvConfig.class));

        Map<String, Object> workflow = JSONUtils.parseObject(
                contentEntity.getDefinitionContent(),
                new TypeReference<Map<String, Object>>() {
                }
        );

        cmd.setWorkflow(workflow == null ? java.util.Collections.emptyMap() : workflow);
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
