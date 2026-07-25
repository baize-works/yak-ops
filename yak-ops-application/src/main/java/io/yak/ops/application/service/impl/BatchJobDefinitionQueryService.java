package io.yak.ops.application.service.impl;

import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.application.service.application.JobScheduleApplicationService;
import io.yak.ops.common.utils.ConvertUtil;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.application.job.registry.BatchJobEditCommandBuilderRegistry;
import io.yak.ops.dao.entity.JobDefinitionContentEntity;
import io.yak.ops.dao.entity.JobDefinitionEntity;
import io.yak.ops.dao.entity.JobSchedule;
import io.yak.ops.dao.repository.JobDefinitionDao;
import io.yak.ops.web.contract.dto.command.JobDefinitionSaveCommand;
import io.yak.ops.web.contract.dto.config.JobScheduleConfig;
import io.yak.ops.web.contract.vo.BatchJobDefinitionVO;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class BatchJobDefinitionQueryService {

    @Resource
    private JobDefinitionDao jobDefinitionDao;

    @Resource
    private JobScheduleApplicationService scheduleApplicationService;

    @Resource
    private BatchJobEditCommandBuilderRegistry editCommandBuilderRegistry;

    /**
     * Query batch job definition detail by id.
     */
    public BatchJobDefinitionVO selectById(Long id) {
        validateId(id);

        try {
            JobDefinitionEntity entity = getDefinitionOrThrow(id);
            BatchJobDefinitionVO vo = ConvertUtil.sourceToTarget(entity, BatchJobDefinitionVO.class);
            fillScheduleFields(id, vo);
            return vo;
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Query batch job definition by id failed, id={}", id, e);
            throw new ServiceException(Status.QUERY_BATCH_JOB_DEFINITION_ERROR);
        }
    }

    /**
     * Query raw definition entity by id.
     */
    public JobDefinitionEntity getDefinitionOrThrow(Long id) {
        validateId(id);

        JobDefinitionEntity entity = jobDefinitionDao.queryById(id);
        if (entity == null) {
            throw new ServiceException(Status.BATCH_JOB_DEFINITION_NOT_EXIST);
        }
        return entity;
    }

    /**
     * Build batch edit command.
     */
    public JobDefinitionSaveCommand buildEditCommand(JobDefinitionEntity definition,
                                                     JobDefinitionContentEntity contentEntity,
                                                     JobScheduleConfig scheduleConfig) {
        if (definition == null || contentEntity == null) {
            throw new ServiceException(Status.BATCH_JOB_DEFINITION_NOT_EXIST);
        }

        return editCommandBuilderRegistry
                .getBuilder(definition.getMode())
                .build(definition, contentEntity, scheduleConfig);
    }

    /**
     * Fill schedule related fields into VO.
     */
    private void fillScheduleFields(Long definitionId, BatchJobDefinitionVO vo) {
        if (definitionId == null || vo == null) {
            return;
        }

        try {
            JobSchedule schedule = scheduleApplicationService.getByTaskDefinitionId(definitionId);
            if (schedule == null) {
                return;
            }

            vo.setCronExpression(schedule.getCronExpression());

            if (schedule.getScheduleStatus() != null) {
                vo.setScheduleStatus(schedule.getScheduleStatus());
            }

            if (StringUtils.isNotBlank(schedule.getScheduleConfig())) {
                vo.setScheduleConfig(schedule.getScheduleConfig());
            }
        } catch (Exception e) {
            log.warn("Fill batch job schedule fields failed, definitionId={}", definitionId, e);
        }
    }

    /**
     * Validate job definition id.
     */
    private void validateId(Long id) {
        if (id == null || id <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "id");
        }
    }
}
