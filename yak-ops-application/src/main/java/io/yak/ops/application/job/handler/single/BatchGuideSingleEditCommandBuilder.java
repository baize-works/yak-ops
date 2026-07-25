package io.yak.ops.application.job.handler.single;

import com.fasterxml.jackson.core.type.TypeReference;
import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.application.job.handler.BatchJobEditCommandBuilder;
import io.yak.ops.dao.entity.JobDefinitionContentEntity;
import io.yak.ops.dao.entity.JobDefinitionEntity;
import io.yak.ops.web.contract.dto.batch.BatchGuideSingleJobSaveCommand;
import io.yak.ops.web.contract.dto.command.JobDefinitionSaveCommand;
import io.yak.ops.web.contract.dto.config.BatchJobEnvConfig;
import io.yak.ops.web.contract.dto.config.JobBasicConfig;
import io.yak.ops.web.contract.dto.config.JobScheduleConfig;
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
