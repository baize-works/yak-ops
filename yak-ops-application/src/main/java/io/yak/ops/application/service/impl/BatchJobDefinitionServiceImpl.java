package io.yak.ops.application.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.application.service.BatchJobDefinitionService;
import io.yak.ops.application.service.BatchJobInstanceService;
import io.yak.ops.application.service.JobScheduleService;
import io.yak.ops.application.service.application.JobScheduleApplicationService;
import io.yak.ops.application.service.cdc.CdcServerIdAllocationService;
import io.yak.ops.common.enums.ReleaseState;
import io.yak.ops.common.modal.JobDefinitionAnalysisResult;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.application.job.assembler.BatchJobDefinitionAssembler;
import io.yak.ops.application.job.handler.JobDefinitionModeHandler;
import io.yak.ops.application.job.registry.JobDefinitionModeHandlerRegistry;
import io.yak.ops.dao.entity.JobDefinitionContentEntity;
import io.yak.ops.dao.entity.JobDefinitionEntity;
import io.yak.ops.dao.entity.JobSchedule;
import io.yak.ops.dao.repository.JobDefinitionContentDao;
import io.yak.ops.dao.repository.JobDefinitionDao;
import io.yak.ops.web.contract.dto.BatchJobDefinitionQueryDTO;
import io.yak.ops.web.contract.dto.batch.BatchGuideMultiJobSaveCommand;
import io.yak.ops.web.contract.dto.batch.BatchGuideSingleJobSaveCommand;
import io.yak.ops.web.contract.dto.batch.BatchScriptJobSaveCommand;
import io.yak.ops.web.contract.dto.command.BatchJobSaveCommand;
import io.yak.ops.web.contract.dto.command.JobDefinitionSaveCommand;
import io.yak.ops.web.contract.dto.config.JobScheduleConfig;
import io.yak.ops.web.contract.response.PaginationResult;
import io.yak.ops.web.contract.vo.BatchJobDefinitionVO;
import io.yak.ops.web.contract.vo.JobDefinitionEditDetailVO;
import io.yak.ops.web.contract.vo.JobDefinitionSaveResultVO;
import io.yak.ops.web.contract.vo.JobDefinitionStateVO;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

@Slf4j
@Service
public class BatchJobDefinitionServiceImpl extends BaseServiceImpl implements BatchJobDefinitionService {

    @Resource
    private JobDefinitionModeHandlerRegistry handlerRegistry;

    @Resource
    private JobDefinitionDao jobDefinitionDao;

    @Resource
    private JobDefinitionContentDao jobDefinitionContentDao;

    @Resource
    private BatchJobDefinitionAssembler jobDefinitionAssembler;

    @Resource
    private JobScheduleApplicationService scheduleApplicationService;

    @Resource
    private BatchJobInstanceService jobInstanceService;

    @Resource
    private BatchJobDefinitionQueryService definitionQueryService;

    @Resource
    private JobScheduleService jobScheduleService;

    @Resource
    private CdcServerIdAllocationService cdcServerIdAllocationService;

    @Resource
    private ObjectMapper objectMapper;

    /**
     * Save or update batch job definition.
     */
    @Transactional(rollbackFor = Exception.class)
    protected JobDefinitionSaveResultVO doSaveOrUpdate(BatchJobSaveCommand command) {
        validateBase(command);

        try {
            Date now = new Date();

            JobDefinitionModeHandler handler = getAndValidateHandler(command);
            JobDefinitionAnalysisResult analysis = handler.analyze(command);

            JobDefinitionEntity existing = command.getId() == null
                    ? null
                    : jobDefinitionDao.queryById(command.getId());

            JobDefinitionEntity entity;
            int nextVersion;

            if (ObjectUtils.isEmpty(existing)) {
                entity = jobDefinitionAssembler.create(command, analysis);
                nextVersion = 1;
            } else {
                nextVersion = existing.getJobVersion() == null ? 1 : existing.getJobVersion() + 1;
                entity = existing;
                jobDefinitionAssembler.update(entity, command, analysis, now, nextVersion);
            }

            normalizePersistState(entity, nextVersion);

            jobDefinitionDao.saveOrUpdate(entity);

            cdcServerIdAllocationService.prepare(command, entity.getId());

            String definitionContent = handler.serializeDefinition(command);

            JobDefinitionContentEntity contentEntity = JobDefinitionContentEntity.builder()
                    .jobDefinitionId(entity.getId())
                    .version(nextVersion)
                    .mode(command.getMode())
                    .contentSchemaVersion(1)
                    .envConfig(JSONUtils.toJsonString(command.getEnv()))
                    .definitionContent(definitionContent)
                    .createTime(now)
                    .build();

            jobDefinitionContentDao.save(contentEntity);

            scheduleApplicationService.saveOrUpdateSchedule(entity.getId(), command);

            return buildSaveResult(entity, nextVersion);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Save or update batch job definition failed, command={}", command, e);
            throw new ServiceException(e.getMessage());
        }
    }

    @Override
    public JobDefinitionSaveResultVO saveOrUpdate(BatchScriptJobSaveCommand command) {
        return doSaveOrUpdate(command);
    }

    @Override
    public JobDefinitionSaveResultVO saveOrUpdate(BatchGuideSingleJobSaveCommand command) {
        return doSaveOrUpdate(command);
    }

    @Override
    public JobDefinitionSaveResultVO saveOrUpdate(BatchGuideMultiJobSaveCommand command) {
        return doSaveOrUpdate(command);
    }

    /**
     * Build hocon config.
     */
    protected String doBuildHoconConfig(JobDefinitionSaveCommand command) {
        validateBase(command);

        try {
            return buildHoconConfigInternal(command);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Build batch hocon config failed, command={}", command, e);
            throw new ServiceException(e.getMessage());
        }
    }

    @Override
    public String buildHoconConfig(BatchScriptJobSaveCommand command) {
        return doBuildHoconConfig(command);
    }

    @Override
    public String buildHoconConfig(BatchGuideSingleJobSaveCommand command) {
        return doBuildHoconConfig(command);
    }

    @Override
    public String buildHoconConfig(BatchGuideMultiJobSaveCommand command) {
        return doBuildHoconConfig(command);
    }

    @Override
    public BatchJobDefinitionVO selectById(Long id) {
        return definitionQueryService.selectById(id);
    }

    @Override
    public PaginationResult<BatchJobDefinitionVO> paging(BatchJobDefinitionQueryDTO dto) {
        validatePagingRequest(dto);

        try {
            int offset = (dto.getPageNo() - 1) * dto.getPageSize();

            List<BatchJobDefinitionVO> records =
                    jobDefinitionDao.selectPageWithLatestInstance(dto, offset, dto.getPageSize());

            Long total = jobDefinitionDao.count(dto);

            if (records != null) {
                records.forEach(vo -> fillScheduleFields(vo.getId(), vo));
            }

            return PaginationResult.buildSuc(records, total, dto.getPageNo(), dto.getPageSize());
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Query batch job definition paging failed, dto={}", dto, e);
            throw new ServiceException(Status.QUERY_BATCH_JOB_DEFINITION_ERROR);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean delete(Long jobDefinitionId) {
        validateId(jobDefinitionId);

        JobDefinitionEntity definition = definitionQueryService.getDefinitionOrThrow(jobDefinitionId);
        validateDelete(definition.getId());

        try {
            cdcServerIdAllocationService.release(jobDefinitionId);
            scheduleApplicationService.removeSchedule(jobDefinitionId);
            jobInstanceService.removeAllByDefinitionId(jobDefinitionId);
            jobDefinitionContentDao.deleteByJobDefinitionId(jobDefinitionId);
            return jobDefinitionDao.deleteById(jobDefinitionId);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Delete batch job definition failed, id={}", jobDefinitionId, e);
            throw new ServiceException(Status.DELETE_BATCH_JOB_DEFINITION_ERROR);
        }
    }

    @Override
    public JobDefinitionEditDetailVO selectEditDetail(Long id) {
        validateId(id);

        try {
            JobDefinitionEntity definition = definitionQueryService.getDefinitionOrThrow(id);

            validateEditable(definition);

            JobDefinitionContentEntity latestContent =
                    jobDefinitionContentDao.queryLatestByJobDefinitionId(id);

            if (latestContent == null) {
                throw new ServiceException(
                        Status.BATCH_JOB_DEFINITION_NOT_EXIST,
                        "definition content not found"
                );
            }

            JobDefinitionSaveCommand command = definitionQueryService.buildEditCommand(
                    definition,
                    latestContent,
                    buildScheduleConfig(id)
            );

            return buildEditDetail(command, definition, latestContent);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Query batch job definition edit detail failed, id={}", id, e);
            throw new ServiceException(e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean updateReleaseState(Long id, ReleaseState releaseState) {
        validateId(id);

        if (releaseState == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "releaseState");
        }

        JobDefinitionEntity entity = jobDefinitionDao.queryById(id);
        if (entity == null) {
            throw new ServiceException(Status.BATCH_JOB_DEFINITION_NOT_EXIST);
        }

        ReleaseState currentState = entity.getReleaseState();

        if (releaseState == currentState) {
            syncScheduleState(id, releaseState);
            log.info("Batch job definition release state already synced, id={}, state={}", id, releaseState);
            return true;
        }

        if (releaseState.isOffline()) {
            syncScheduleState(id, ReleaseState.OFFLINE);
            updateJobReleaseState(id, ReleaseState.OFFLINE);

            log.info("Batch job definition offline completed, id={}", id);
            return true;
        }

        if (releaseState.isOnline()) {
            updateJobReleaseState(id, ReleaseState.ONLINE);
            syncScheduleState(id, ReleaseState.ONLINE);

            log.info("Batch job definition online completed, id={}", id);
            return true;
        }

        throw new RuntimeException("Unsupported release state: " + releaseState);
    }

    @Override
    public List<BatchJobDefinitionVO> listByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<Long> validIds = ids.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        if (validIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        try {
            List<JobDefinitionEntity> records = jobDefinitionDao.listByIds(validIds);

            if (records == null || records.isEmpty()) {
                return java.util.Collections.emptyList();
            }

            return records.stream()
                    .map(item -> {
                        BatchJobDefinitionVO vo = new BatchJobDefinitionVO();
                        vo.setId(item.getId());
                        vo.setJobName(item.getJobName());
                        vo.setJobDesc(item.getJobDesc());
                        vo.setMode(item.getMode());
                        vo.setJobType(item.getJobType());
                        vo.setClientId(item.getClientId());
                        vo.setJobVersion(item.getJobVersion());
                        vo.setReleaseState(item.getReleaseState());
                        vo.setSourceType(item.getSourceType());
                        vo.setSinkType(item.getSinkType());
                        vo.setSourceDatasourceId(item.getSourceDatasourceId());
                        vo.setSinkDatasourceId(item.getSinkDatasourceId());
                        vo.setSourceTable(item.getSourceTable());
                        vo.setSinkTable(item.getSinkTable());
                        vo.setCreateTime(item.getCreateTime());
                        vo.setUpdateTime(item.getUpdateTime());
                        return vo;
                    })
                    .collect(java.util.stream.Collectors.toList());
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("List batch job definitions by ids failed, ids={}", validIds, e);
            throw new ServiceException(Status.QUERY_BATCH_JOB_DEFINITION_ERROR);
        }
    }

    /**
     * Normalize persisted job definition state before saving.
     */
    private void normalizePersistState(JobDefinitionEntity entity, Integer nextVersion) {
        if (entity == null) {
            return;
        }

        entity.setJobVersion(nextVersion);

        if (entity.getReleaseState() == null) {
            entity.setReleaseState(ReleaseState.OFFLINE);
        }
    }

    /**
     * Build save result after job definition has been persisted.
     */
    private JobDefinitionSaveResultVO buildSaveResult(JobDefinitionEntity entity, Integer contentVersion) {
        JobDefinitionStateVO state = JobDefinitionStateVO.synced(
                resolveReleaseState(entity.getReleaseState()),
                entity.getJobVersion(),
                contentVersion
        );

        return JobDefinitionSaveResultVO.builder()
                .id(entity.getId())
                .state(state)
                .build();
    }

    /**
     * Build edit detail response with editor state.
     */
    private JobDefinitionEditDetailVO buildEditDetail(
            JobDefinitionSaveCommand command,
            JobDefinitionEntity definition,
            JobDefinitionContentEntity latestContent) {
        JobDefinitionEditDetailVO detail = objectMapper.convertValue(
                command,
                JobDefinitionEditDetailVO.class
        );

        detail.setState(JobDefinitionStateVO.synced(
                resolveReleaseState(definition.getReleaseState()),
                definition.getJobVersion(),
                latestContent.getVersion()
        ));

        return detail;
    }

    private ReleaseState resolveReleaseState(ReleaseState releaseState) {
        return releaseState == null ? ReleaseState.OFFLINE : releaseState;
    }

    /**
     * Validate whether job definition can be edited.
     */
    private void validateEditable(JobDefinitionEntity definition) {
        if (definition == null) {
            throw new ServiceException(Status.BATCH_JOB_DEFINITION_NOT_EXIST);
        }

        if (definition.getReleaseState() == null) {
            throw new RuntimeException("job release state is empty");
        }

        if (!definition.getReleaseState().isOffline()) {
            throw new RuntimeException("only offline job definition can be edited");
        }
    }

    private void updateJobReleaseState(Long jobDefinitionId, ReleaseState releaseState) {
        boolean updated = jobDefinitionDao.updateReleaseState(jobDefinitionId, releaseState);

        if (!updated) {
            throw new RuntimeException("Failed to update batch job definition release state");
        }
    }

    private void syncScheduleState(Long jobDefinitionId, ReleaseState releaseState) {
        JobSchedule schedule = jobScheduleService.getByTaskDefinitionId(jobDefinitionId);
        if (schedule == null) {
            log.info("No schedule found for batch job definition, skip schedule sync. jobDefinitionId={}", jobDefinitionId);
            return;
        }

        if (releaseState.isOnline()) {
            jobScheduleService.startSchedule(schedule.getId());
            log.info(
                    "Schedule started with batch job definition online, jobDefinitionId={}, scheduleId={}",
                    jobDefinitionId,
                    schedule.getId()
            );
            return;
        }

        if (releaseState.isOffline()) {
            jobScheduleService.stopSchedule(schedule.getId());
            log.info(
                    "Schedule stopped with batch job definition offline, jobDefinitionId={}, scheduleId={}",
                    jobDefinitionId,
                    schedule.getId()
            );
        }
    }

    /**
     * Build hocon config internally.
     */
    private String buildHoconConfigInternal(JobDefinitionSaveCommand command) {
        JobDefinitionModeHandler handler = getAndValidateHandler(command);
        String hocon = handler.buildHoconConfig(command);

        if (StringUtils.isBlank(hocon)) {
            throw new ServiceException(
                    Status.BUILD_BATCH_JOB_HOCON_CONFIG_ERROR,
                    "hocon config is empty"
            );
        }

        return hocon;
    }

    /**
     * Get handler and validate command.
     */
    private JobDefinitionModeHandler getAndValidateHandler(JobDefinitionSaveCommand command) {
        validateBase(command);

        JobDefinitionModeHandler handler = handlerRegistry.getHandler(command.getMode());
        handler.validate(command);

        return handler;
    }

    /**
     * Build schedule config.
     */
    private JobScheduleConfig buildScheduleConfig(Long definitionId) {
        JobSchedule schedule = scheduleApplicationService.getByTaskDefinitionId(definitionId);
        if (schedule == null) {
            return null;
        }

        JobScheduleConfig config = null;
        if (StringUtils.isNotBlank(schedule.getScheduleConfig())) {
            try {
                config = JSONUtils.parseObject(schedule.getScheduleConfig(), JobScheduleConfig.class);
            } catch (Exception e) {
                log.warn(
                        "Parse schedule config failed, definitionId={}, raw={}",
                        definitionId,
                        schedule.getScheduleConfig(),
                        e
                );
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

    /**
     * Fill schedule fields for page result.
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
            log.warn("Fill schedule fields failed, definitionId={}", definitionId, e);
        }
    }

    /**
     * Validate save request base fields.
     */
    private void validateBase(JobDefinitionSaveCommand command) {
        if (command == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "command");
        }

        if (command.getBasic() == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "basic");
        }

        if (command.getMode() == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "mode");
        }

        if (command.getId() == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "id");
        }

        if (StringUtils.isBlank(command.getBasic().getJobName())) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "jobName");
        }

        if (command.getEnv() == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "env");
        }
    }

    /**
     * Validate paging request.
     */
    private void validatePagingRequest(BatchJobDefinitionQueryDTO dto) {
        if (dto == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "dto");
        }

        if (dto.getPageNo() == null || dto.getPageNo() <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "pageNo");
        }

        if (dto.getPageSize() == null || dto.getPageSize() <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "pageSize");
        }
    }

    /**
     * Validate id.
     */
    private void validateId(Long id) {
        if (id == null || id <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "id");
        }
    }

    /**
     * Validate delete condition.
     */
    private void validateDelete(Long id) {
        if (jobInstanceService.existsRunningInstance(id)) {
            throw new ServiceException(
                    Status.DELETE_BATCH_JOB_DEFINITION_ERROR,
                    "running instance exists"
            );
        }

        JobSchedule schedule = scheduleApplicationService.getByTaskDefinitionId(id);
        if (schedule != null
                && schedule.getScheduleStatus() != null
                && schedule.getScheduleStatus().shouldStartQuartz()) {
            throw new ServiceException(
                    Status.DELETE_BATCH_JOB_DEFINITION_ERROR,
                    "schedule is still active"
            );
        }
    }
}
