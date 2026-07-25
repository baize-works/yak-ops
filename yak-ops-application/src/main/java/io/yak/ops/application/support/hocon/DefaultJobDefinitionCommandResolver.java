package io.yak.ops.application.support.hocon;

import com.fasterxml.jackson.core.type.TypeReference;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.dao.entity.JobDefinitionContentEntity;
import io.yak.ops.dao.entity.JobDefinitionEntity;
import io.yak.ops.dao.entity.JobSchedule;
import io.yak.ops.dao.repository.JobDefinitionContentDao;
import io.yak.ops.dao.repository.JobDefinitionDao;
import io.yak.ops.dao.repository.JobScheduleDao;
import io.yak.ops.web.contract.dto.*;
import io.yak.ops.web.contract.dto.batch.BatchGuideMultiJobSaveCommand;
import io.yak.ops.web.contract.dto.batch.BatchGuideSingleJobSaveCommand;
import io.yak.ops.web.contract.dto.batch.BatchScriptJobSaveCommand;
import io.yak.ops.web.contract.dto.command.JobDefinitionSaveCommand;
import io.yak.ops.web.contract.dto.config.*;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Resolve persisted definition data into specific save command.
 */
@Component
@Slf4j
public class DefaultJobDefinitionCommandResolver implements JobDefinitionCommandResolver {

    private final JobDefinitionDao jobDefinitionDao;
    private final JobDefinitionContentDao jobDefinitionContentDao;
    private final JobScheduleDao jobScheduleDao;

    public DefaultJobDefinitionCommandResolver(JobDefinitionDao jobDefinitionDao,
                                               JobDefinitionContentDao jobDefinitionContentDao,
                                               JobScheduleDao jobScheduleDao) {
        this.jobDefinitionDao = jobDefinitionDao;
        this.jobDefinitionContentDao = jobDefinitionContentDao;
        this.jobScheduleDao = jobScheduleDao;
    }

    @Override
    public JobDefinitionSaveCommand resolve(Long jobDefinitionId) {
        if (jobDefinitionId == null || jobDefinitionId <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "jobDefinitionId");
        }

        try {
            JobDefinitionEntity definition = jobDefinitionDao.queryById(jobDefinitionId);
            if (definition == null) {
                throw new ServiceException(Status.JOB_DEFINITION_NOT_EXIST);
            }

            JobDefinitionContentEntity latestContent =
                    jobDefinitionContentDao.queryLatestByJobDefinitionId(jobDefinitionId);
            if (latestContent == null || StringUtils.isBlank(latestContent.getDefinitionContent())) {
                throw new ServiceException(Status.BATCH_JOB_DEFINITION_NOT_EXIST, "definition content not found");
            }

            JobDefinitionMode mode = definition.getMode();
            if (mode == null) {
                throw new ServiceException(Status.BATCH_JOB_DEFINITION_NOT_EXIST, "definition mode not found");
            }

            return buildCommand(definition, latestContent, definition.getClientId());
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Resolve job definition command failed, jobDefinitionId={}", jobDefinitionId, e);
            throw new ServiceException(Status.QUERY_BATCH_JOB_DEFINITION_ERROR);
        }
    }

    /**
     * Build concrete save command from definition entity and persisted content.
     */
    private JobDefinitionSaveCommand buildCommand(JobDefinitionEntity definition, JobDefinitionContentEntity definitionContent, Long clientId) {
        JobDefinitionMode mode = definition.getMode();

        switch (mode) {
            case SCRIPT:
                return buildScriptCommand(definition, definitionContent);
            case GUIDE_SINGLE:
                return buildGuideSingleCommand(definition, definitionContent);
            case GUIDE_MULTI:
                return buildGuideMultiCommand(definition, definitionContent);
            default:
                throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "unsupported mode: " + mode);
        }
    }

    private BatchScriptJobSaveCommand buildScriptCommand(JobDefinitionEntity definition, JobDefinitionContentEntity jobDefinitionContentEntity) {
        BatchScriptJobSaveCommand command = new BatchScriptJobSaveCommand();
        command.setContent(JSONUtils.parseObject(jobDefinitionContentEntity.getDefinitionContent(), ScriptJobContent.class));
        command.setBasic(buildBasic(definition));
        command.setId(definition.getId());
        command.setSchedule(buildScheduleConfig(definition.getId()));
        return command;
    }

    private BatchGuideSingleJobSaveCommand buildGuideSingleCommand(JobDefinitionEntity definition, JobDefinitionContentEntity jobDefinitionContentEntity) {
        BatchGuideSingleJobSaveCommand command = new BatchGuideSingleJobSaveCommand();
        command.setBasic(buildBasic(definition));
        command.setWorkflow(JSONUtils.parseObject(
                jobDefinitionContentEntity.getDefinitionContent(),
                new TypeReference<Map<String, Object>>() {
                }
        ));
        command.setSchedule(buildScheduleConfig(definition.getId()));
        command.setId(definition.getId());
        command.setEnv(JSONUtils.parseObject(jobDefinitionContentEntity.getEnvConfig(), BatchJobEnvConfig.class));
        return command;
    }

    private BatchGuideMultiJobSaveCommand buildGuideMultiCommand(JobDefinitionEntity definition, JobDefinitionContentEntity jobDefinitionContentEntity) {
        BatchGuideMultiJobSaveCommand command = new BatchGuideMultiJobSaveCommand();
        command.setBasic(buildBasic(definition));
        command.setContent(JSONUtils.parseObject(jobDefinitionContentEntity.getDefinitionContent(), GuideMultiJobContent.class));
        command.setEnv(JSONUtils.parseObject(jobDefinitionContentEntity.getEnvConfig(), BatchJobEnvConfig.class));
        command.setId(definition.getId());
        command.setSchedule(buildScheduleConfig(definition.getId()));
        return command;
    }

    /**
     * Build basic config from persisted definition entity.
     */
    private JobBasicConfig buildBasic(JobDefinitionEntity definition) {
        JobBasicConfig basic = new JobBasicConfig();
        basic.setMode(definition.getMode());
        basic.setJobName(definition.getJobName());
        basic.setJobDesc(definition.getJobDesc());
        basic.setClientId(definition.getClientId());
        return basic;
    }

    /**
     * Build schedule config.
     */
    private JobScheduleConfig buildScheduleConfig(Long definitionId) {
        JobSchedule schedule = jobScheduleDao.queryByJobDefinitionId(definitionId);
        if (schedule == null) {
            throw new RuntimeException("schedule is null");
        }

        JobScheduleConfig config = null;
        if (StringUtils.isNotBlank(schedule.getScheduleConfig())) {
            try {
                config = JSONUtils.parseObject(schedule.getScheduleConfig(), JobScheduleConfig.class);
            } catch (Exception e) {
                log.warn("Parse schedule config failed, definitionId={}, raw={}",
                        definitionId, schedule.getScheduleConfig(), e);
            }
        }

        if (config == null) {
            config = new JobScheduleConfig();
        }

        if (StringUtils.isBlank(config.getCronExpression())) {
            config.setCronExpression(schedule.getCronExpression());
        }
        if (StringUtils.isBlank(config.getScheduleRunType()) && schedule.getScheduleStatus() != null) {
            config.setScheduleRunType(schedule.getScheduleStatus().getDesc());
        }

        return config;
    }
}
