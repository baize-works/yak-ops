package io.baize.flow.dao.repository.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import javax.annotation.Resource;
import lombok.NonNull;
import io.baize.flow.domain.enums.JobMode;
import io.baize.flow.domain.enums.JobStatus;
import io.baize.flow.common.utils.ConvertUtil;
import io.baize.flow.domain.status.JobStatusHelper;
import io.baize.flow.dao.entity.JobInstance;
import io.baize.flow.dao.mapper.JobInstanceMapper;
import io.baize.flow.dao.repository.BaseDao;
import io.baize.flow.dao.repository.JobInstanceDao;
import io.baize.flow.web.contract.dto.SeaTunnelJobInstanceDTO;
import io.baize.flow.web.contract.vo.JobInstanceVO;
import org.springframework.stereotype.Repository;

import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Repository
public class JobInstanceDaoImpl
        extends BaseDao<JobInstance, JobInstanceMapper>
        implements JobInstanceDao {

    @Resource
    private JobInstanceMapper jobInstanceMapper;

    public JobInstanceDaoImpl(@NonNull JobInstanceMapper jobInstanceMapper) {
        super(jobInstanceMapper);
    }

    @Override
    public IPage<JobInstanceVO> pageWithDefinition(SeaTunnelJobInstanceDTO dto) {
        long pageNo = dto.getPageNo() == null || dto.getPageNo() < 1 ? 1 : dto.getPageNo();
        long pageSize = dto.getPageSize() == null || dto.getPageSize() < 1 ? 10 : dto.getPageSize();

        Page<JobInstanceVO> page = new Page<>(pageNo, pageSize);
        return jobInstanceMapper.pageWithDefinition(page, dto);
    }

    @Override
    public int failRunningInstancesByClientId(Long clientId, String errorMessage) {
        if (clientId == null || clientId <= 0) {
            return 0;
        }

        Date now = new Date();

        LambdaUpdateWrapper<JobInstance> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(JobInstance::getClientId, clientId)
                .in(JobInstance::getJobStatus, JobStatusHelper.runningLikeStatuses())
                .set(JobInstance::getJobStatus, JobStatus.FAILED)
                .set(JobInstance::getErrorMessage, truncate(errorMessage, 2000))
                .set(JobInstance::getEndTime, now)
                .set(JobInstance::getUpdateTime, now);

        return jobInstanceMapper.update(null, wrapper);
    }

    @Override
    public JobInstanceVO selectDetailById(Long id) {
        if (id == null || id <= 0) {
            return null;
        }

        return jobInstanceMapper.selectDetailById(id);
    }

    @Override
    public boolean existsRunningInstance(Long definitionId) {
        LambdaQueryWrapper<JobInstance> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(JobInstance::getJobDefinitionId, definitionId)
                .in(JobInstance::getJobStatus,
                        JobStatus.INITIALIZING,
                        JobStatus.CREATED,
                        JobStatus.PENDING,
                        JobStatus.SCHEDULED,
                        JobStatus.RUNNING,
                        JobStatus.FAILING,
                        JobStatus.DOING_SAVEPOINT,
                        JobStatus.CANCELING);

        Long count = jobInstanceMapper.selectCount(wrapper);
        return count != null && count > 0;
    }

    @Override
    public void deleteByDefinitionId(Long definitionId) {
        LambdaQueryWrapper<JobInstance> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(JobInstance::getJobDefinitionId, definitionId);
        jobInstanceMapper.delete(wrapper);
    }

    @Override
    public List<JobInstance> listRunningLikeInstances() {
        LambdaQueryWrapper<JobInstance> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(JobInstance::getJobStatus,
                JobStatus.INITIALIZING,
                JobStatus.CREATED,
                JobStatus.PENDING,
                JobStatus.SCHEDULED,
                JobStatus.RUNNING,
                JobStatus.FAILING,
                JobStatus.DOING_SAVEPOINT,
                JobStatus.CANCELING)
                .orderByDesc(JobInstance::getCreateTime);

        List<JobInstance> records = jobInstanceMapper.selectList(wrapper);
        return records == null ? java.util.Collections.emptyList() : records;
    }

    @Override
    public void updateStatus(Long instanceId, JobStatus status, String errorMessage) {
        boolean endState = status.isEndState();
        Date now = new Date();

        LambdaUpdateWrapper<JobInstance> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(JobInstance::getId, instanceId)
                .set(JobInstance::getJobStatus, status)
                .set(JobInstance::getUpdateTime, now);

        if (errorMessage != null && !errorMessage.trim().isEmpty()) {
            wrapper.set(JobInstance::getErrorMessage, truncate(errorMessage, 2000));
        }
        if (endState) {
            wrapper.set(JobInstance::getEndTime, now);
        }

        jobInstanceMapper.update(null, wrapper);
    }

    @Override
    public void updateStatusAndEngineId(Long instanceId, JobStatus status, String engineJobId) {
        boolean endState = status.isEndState();
        Date now = new Date();

        LambdaUpdateWrapper<JobInstance> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(JobInstance::getId, instanceId)
                .set(JobInstance::getJobStatus, status)
                .set(JobInstance::getUpdateTime, now);

        if (engineJobId != null && !engineJobId.trim().isEmpty()) {
            wrapper.set(JobInstance::getEngineJobId, engineJobId);
        }
        if (endState) {
            wrapper.set(JobInstance::getEndTime, now);
        }

        jobInstanceMapper.update(null, wrapper);
    }

    @Override
    public void updateSubmitResult(Long instanceId, String engineJobId, JobStatus submitStatus, Date submitTime) {
        JobInstance update = new JobInstance();
        update.setId(instanceId);
        update.setEngineJobId(engineJobId);
        update.setJobStatus(submitStatus);
        update.setSubmitTime(submitTime);
        update.setUpdateTime(new Date());

        if (JobStatus.RUNNING.equals(submitStatus)
                || JobStatus.INITIALIZING.equals(submitStatus)
                || JobStatus.PENDING.equals(submitStatus)
                || JobStatus.SCHEDULED.equals(submitStatus)) {
            update.setStartTime(submitTime);
        }

        jobInstanceMapper.updateById(update);
    }

    @Override
    public List<JobInstanceVO> listRunningByJobType(JobMode jobMode) {
        if (jobMode == null) {
            return java.util.Collections.emptyList();
        }

        LambdaQueryWrapper<JobInstance> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(JobInstance::getJobMode, jobMode)
                .isNotNull(JobInstance::getClientId)
                .isNotNull(JobInstance::getEngineJobId)
                .in(JobInstance::getJobStatus,
                        JobStatus.INITIALIZING,
                        JobStatus.CREATED,
                        JobStatus.PENDING,
                        JobStatus.SCHEDULED,
                        JobStatus.RUNNING,
                        JobStatus.FAILING,
                        JobStatus.DOING_SAVEPOINT,
                        JobStatus.CANCELING);

        List<JobInstance> records = jobInstanceMapper.selectList(wrapper);

        if (records == null || records.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        return records.stream()
                .map(item -> ConvertUtil.sourceToTarget(item, JobInstanceVO.class))
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public List<JobInstance> selectRunningInstanceByDefinitionIds(List<Long> definitionIds) {
        if (definitionIds == null || definitionIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<Long> validDefinitionIds = definitionIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        if (validDefinitionIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        LambdaQueryWrapper<JobInstance> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(JobInstance::getJobDefinitionId, validDefinitionIds)
                .in(JobInstance::getJobStatus,
                        JobStatus.INITIALIZING,
                        JobStatus.CREATED,
                        JobStatus.PENDING,
                        JobStatus.SCHEDULED,
                        JobStatus.RUNNING,
                        JobStatus.FAILING,
                        JobStatus.DOING_SAVEPOINT,
                        JobStatus.CANCELING)
                .orderByDesc(JobInstance::getCreateTime);

        List<JobInstance> records = jobInstanceMapper.selectList(wrapper);
        if (records == null || records.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        return records;
    }

    private String truncate(String text, int maxLength) {
        if (text == null) {
            return null;
        }
        if (text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength);
    }
}
