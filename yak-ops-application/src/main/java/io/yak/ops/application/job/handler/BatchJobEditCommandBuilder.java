package io.yak.ops.application.job.handler;

import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.dao.entity.JobDefinitionContentEntity;
import io.yak.ops.dao.entity.JobDefinitionEntity;
import io.yak.ops.application.model.dto.command.JobDefinitionSaveCommand;
import io.yak.ops.application.model.dto.config.JobScheduleConfig;

public interface BatchJobEditCommandBuilder {

    JobDefinitionMode mode();

    JobDefinitionSaveCommand build(
            JobDefinitionEntity definition,
            JobDefinitionContentEntity contentEntity,
            JobScheduleConfig scheduleConfig
    );
}
