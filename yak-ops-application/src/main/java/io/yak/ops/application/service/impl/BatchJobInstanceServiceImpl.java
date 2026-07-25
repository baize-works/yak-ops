package io.yak.ops.application.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.application.service.BatchJobInstanceService;
import io.yak.ops.application.service.support.JobInstanceFactory;
import io.yak.ops.application.support.hocon.HoconSensitiveMaskUtil;
import io.yak.ops.domain.enums.JobMode;
import io.yak.ops.domain.enums.RunMode;
import io.yak.ops.common.utils.CodeGenerateUtils;
import io.yak.ops.common.utils.ConvertUtil;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.application.support.hocon.JobDefinitionCommandResolver;
import io.yak.ops.application.support.hocon.JobDefinitionHoconBuilder;
import io.yak.ops.dao.entity.JobInstance;
import io.yak.ops.dao.repository.JobInstanceDao;
import io.yak.ops.dao.repository.JobMetricsDao;
import io.yak.ops.dao.repository.JobTableMetricsDao;
import io.yak.ops.dao.model.query.JobInstanceQuery;
import io.yak.ops.dao.model.result.JobInstanceResult;
import io.yak.ops.dao.model.result.JobTableMetricsResult;
import io.yak.ops.application.model.dto.LinkUpJobInstanceDTO;
import io.yak.ops.application.model.dto.command.JobDefinitionSaveCommand;
import io.yak.ops.application.model.response.PaginationResult;
import io.yak.ops.application.model.vo.JobInstanceVO;
import io.yak.ops.application.model.vo.JobTableMetricsVO;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
@Slf4j
public class BatchJobInstanceServiceImpl implements BatchJobInstanceService {

    @Resource
    private JobInstanceDao jobInstanceDao;

    @Resource
    private JobMetricsDao jobMetricsDao;

    @Resource
    private JobInstanceFactory jobInstanceFactory;

    @Resource
    private JobDefinitionHoconBuilder jobDefinitionHoconBuilder;

    @Resource
    private JobDefinitionCommandResolver jobDefinitionCommandResolver;

    @Value("${linkup.job.log-dir:logs}")
    private String baseLogDir;

    @Value("${linkup.job.max-log-query-bytes:52428800}")
    private long maxLogQueryBytes;

    @Resource
    private JobTableMetricsDao jobTableMetricsDao;

    @PostConstruct
    public void init() {
        log.info("BatchJobInstanceServiceImpl initialized: {}", System.identityHashCode(this));
    }

    @Override
    public JobInstanceVO create(Long jobDefineId, RunMode runMode) {
        validateDefinitionId(jobDefineId);
        validateRunMode(runMode);

        try {
            log.info("Creating batch job instance, jobDefineId={}, runMode={}", jobDefineId, runMode);

            JobDefinitionSaveCommand command = loadDefinitionCommand(jobDefineId);
            JobInstance instance = buildJobInstance(command, runMode);

            jobInstanceDao.insert(instance);

            log.info("Batch job instance created successfully, instanceId={}", instance.getId());
            return ConvertUtil.sourceToTarget(instance, JobInstanceVO.class);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Create batch job instance failed, jobDefineId={}, runMode={}", jobDefineId, runMode, e);
            throw new ServiceException(Status.CREATE_BATCH_JOB_INSTANCE_ERROR);
        }
    }

    @Override
    public PaginationResult<JobInstanceVO> paging(LinkUpJobInstanceDTO dto) {
        validatePagingRequest(dto);

        try {
            JobInstanceQuery query = ConvertUtil.sourceToTarget(dto, JobInstanceQuery.class);
            IPage<JobInstanceResult> pageResult = jobInstanceDao.pageWithDefinition(query);
            List<JobInstanceVO> records = ConvertUtil.sourceListToTarget(
                    pageResult.getRecords(), JobInstanceVO.class);

            if (records != null) {
                records.forEach(this::maskSensitiveFields);
            }

            return PaginationResult.buildSuc(
                    records,
                    pageResult.getTotal(),
                    pageResult.getCurrent(),
                    pageResult.getSize());
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Query batch job instance paging failed, dto={}", dto, e);
            throw new ServiceException(Status.QUERY_BATCH_JOB_INSTANCE_ERROR);
        }
    }

    @Override
    public String buildJobConfig(JobDefinitionSaveCommand command) {
        validateDefinitionCommand(command);

        try {
            return jobDefinitionHoconBuilder.build(command);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Build batch job config failed, command={}", command, e);
            throw new ServiceException(Status.BUILD_JOB_INSTANCE_CONFIG_ERROR);
        }
    }

    @Override
    public JobInstanceVO selectById(Long id) {
        validateInstanceId(id);

        try {
            JobInstanceResult result = jobInstanceDao.selectDetailById(id);
            JobInstanceVO vo = result == null ? null :
                    ConvertUtil.sourceToTarget(result, JobInstanceVO.class);
            if (vo == null) {
                throw new ServiceException(Status.BATCH_JOB_INSTANCE_NOT_EXIST);
            }

            vo.setTableMetrics(listTableMetrics(id));

            maskSensitiveFields(vo);
            return vo;
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Query batch job instance by id failed, id={}", id, e);
            throw new ServiceException(Status.QUERY_BATCH_JOB_INSTANCE_ERROR);
        }
    }

    @Override
    public String getLogContent(Long instanceId) {
        validateInstanceId(instanceId);

        try {
            JobInstanceVO instance = selectById(instanceId);
            String logPath = instance.getLogPath();

            if (StringUtils.isBlank(logPath)) {
                throw new ServiceException(Status.BATCH_JOB_INSTANCE_LOG_NOT_EXIST);
            }

            Path path = Paths.get(logPath);
            if (!Files.exists(path)) {
                throw new ServiceException(Status.BATCH_JOB_INSTANCE_LOG_NOT_EXIST);
            }

            long fileSize = Files.size(path);
            if (fileSize > maxLogQueryBytes) {
                log.warn(
                        "Batch job log file is too large, instanceId={}, path={}, fileSize={}, maxLogQueryBytes={}",
                        instanceId,
                        path,
                        fileSize,
                        maxLogQueryBytes
                );

                throw new ServiceException(
                        Status.QUERY_BATCH_JOB_INSTANCE_LOG_ERROR.getCode(),
                        "当前日志文件过大（>50MB)，请在服务器上查看"
                );
            }

            byte[] bytes = Files.readAllBytes(path);
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (ServiceException e) {
            throw e;
        } catch (IOException e) {
            log.error("Read batch job instance log failed, instanceId={}", instanceId, e);
            throw new ServiceException(Status.QUERY_BATCH_JOB_INSTANCE_LOG_ERROR);
        } catch (Exception e) {
            log.error("Query batch job instance log failed, instanceId={}", instanceId, e);
            throw new ServiceException(Status.QUERY_BATCH_JOB_INSTANCE_LOG_ERROR);
        }
    }

    @Override
    public boolean existsRunningInstance(Long definitionId) {
        if (definitionId == null) {
            return false;
        }

        try {
            return jobInstanceDao.existsRunningInstance(definitionId);
        } catch (Exception e) {
            log.error("Check running batch job instance failed, definitionId={}", definitionId, e);
            throw new ServiceException(Status.QUERY_BATCH_JOB_INSTANCE_ERROR);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void removeAllByDefinitionId(Long definitionId) {
        if (definitionId == null) {
            return;
        }

        try {
            jobTableMetricsDao.deleteByDefinitionId(definitionId);
            jobMetricsDao.deleteByDefinitionId(definitionId);
            jobInstanceDao.deleteByDefinitionId(definitionId);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Remove all batch job instances by definition id failed, definitionId={}", definitionId, e);
            throw new ServiceException(Status.DELETE_BATCH_JOB_INSTANCE_ERROR);
        }
    }

    @Override
    public void updateById(JobInstance po) {
        if (po == null || po.getId() == null || po.getId() <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "jobInstance");
        }

        try {
            jobInstanceDao.updateById(po);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Update batch job instance failed, id={}", po.getId(), e);
            throw  new ServiceException(Status.UPDATE_BATCH_JOB_INSTANCE_ERROR);
        }
    }

    @Override
    public List<JobTableMetricsVO> listTableMetrics(Long instanceId) {
        validateInstanceId(instanceId);

        try {
            List<JobTableMetricsResult> results = jobTableMetricsDao.selectByInstanceId(instanceId);
            return ConvertUtil.sourceListToTarget(results, JobTableMetricsVO.class);
        } catch (Exception e) {
            log.error("Query table metrics failed, instanceId={}", instanceId, e);
            throw new ServiceException(Status.QUERY_BATCH_JOB_INSTANCE_ERROR);
        }
    }

    @Override
    public List<JobInstance> listRunningInstanceByDefinitionIds(List<Long> definitionIds) {
        if (definitionIds == null || definitionIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        try {
            return jobInstanceDao.selectRunningInstanceByDefinitionIds(definitionIds);
        } catch (Exception e) {
            log.error("Query running batch job instances failed, definitionIds={}", definitionIds, e);
            throw new ServiceException(Status.QUERY_BATCH_JOB_INSTANCE_ERROR);
        }
    }

    /**
     * Load persisted definition command for instance creation.
     */
    private JobDefinitionSaveCommand loadDefinitionCommand(Long jobDefineId) {
        return jobDefinitionCommandResolver.resolve(jobDefineId);
    }

    /**
     * Build job instance entity.
     */
    private JobInstance buildJobInstance(JobDefinitionSaveCommand command, RunMode runMode) {
        Long id = generateInstanceId();
        String runtimeConfig = buildJobConfig(command);

        return jobInstanceFactory.create(
                command,
                id,
                runtimeConfig,
                runMode,
                buildLogPath(id),
                JobMode.BATCH
        );
    }

    /**
     * Generate instance id.
     */
    private Long generateInstanceId() {
        try {
            return CodeGenerateUtils.getInstance().genCode();
        } catch (CodeGenerateUtils.CodeGenerateException e) {
            log.error("Generate batch job instance id failed", e);
            throw new ServiceException(Status.GENERATE_JOB_INSTANCE_ID_ERROR);
        }
    }

    /**
     * Build log file path.
     */
    private String buildLogPath(Long id) {
        return System.getProperty("user.dir")
                + File.separator
                + Paths.get(baseLogDir, "job-" + id + ".log");
    }

    /**
     * Query instance by id or throw exception.
     */
    private JobInstance getJobInstanceOrThrow(Long id) {
        JobInstance entity = jobInstanceDao.queryById(id);
        if (entity == null) {
            throw new ServiceException(Status.BATCH_JOB_INSTANCE_NOT_EXIST);
        }
        return entity;
    }

    /**
     * Validate definition id.
     */
    private void validateDefinitionId(Long jobDefineId) {
        if (jobDefineId == null || jobDefineId <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "jobDefineId");
        }
    }

    /**
     * Validate instance id.
     */
    private void validateInstanceId(Long instanceId) {
        if (instanceId == null || instanceId <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "instanceId");
        }
    }

    /**
     * Validate run mode.
     */
    private void validateRunMode(RunMode runMode) {
        if (runMode == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "runMode");
        }
    }

    /**
     * Validate paging request.
     */
    private void validatePagingRequest(LinkUpJobInstanceDTO dto) {
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
     * Validate definition command.
     */
    private void validateDefinitionCommand(JobDefinitionSaveCommand command) {
        if (command == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "jobDefinition");
        }
    }

    /**
     * Mask sensitive fields before return.
     */
    private void maskSensitiveFields(JobInstanceVO vo) {
        if (vo == null) {
            return;
        }

        if (vo.getRuntimeConfig() != null) {
            vo.setRuntimeConfig(HoconSensitiveMaskUtil.maskSensitiveInfo(vo.getRuntimeConfig()));
        }
    }
}
