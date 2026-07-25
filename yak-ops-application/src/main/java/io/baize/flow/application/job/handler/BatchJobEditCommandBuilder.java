package io.baize.flow.application.job.handler;

import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.dao.entity.JobDefinitionContentEntity;
import io.baize.flow.dao.entity.JobDefinitionEntity;
import io.baize.flow.web.contract.dto.command.JobDefinitionSaveCommand;
import io.baize.flow.web.contract.dto.config.JobScheduleConfig;

public interface BatchJobEditCommandBuilder {

    JobDefinitionMode mode();

    JobDefinitionSaveCommand build(
            JobDefinitionEntity definition,
            JobDefinitionContentEntity contentEntity,
            JobScheduleConfig scheduleConfig
    );
}
