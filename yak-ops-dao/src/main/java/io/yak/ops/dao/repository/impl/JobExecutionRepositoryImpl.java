package io.yak.ops.dao.repository.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import io.yak.ops.dao.entity.JobExecutionEntity;
import io.yak.ops.dao.mapper.JobExecutionMapper;
import io.yak.ops.domain.job.JobExecutionRecord;
import io.yak.ops.domain.job.JobExecutionRepository;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class JobExecutionRepositoryImpl implements JobExecutionRepository {
    private final JobExecutionMapper mapper;
    @Override public JobExecutionRecord save(JobExecutionRecord record) {
        JobExecutionEntity entity = toEntity(record);
        if (entity.getId() == null) mapper.insert(entity); else mapper.updateById(entity);
        return toRecord(entity);
    }
    @Override public Optional<JobExecutionRecord> findByInstanceIdAndAttemptNo(long instanceId, int attemptNo) {
        return Optional.ofNullable(mapper.selectOne(new LambdaQueryWrapper<JobExecutionEntity>().eq(JobExecutionEntity::getInstanceId, instanceId).eq(JobExecutionEntity::getAttemptNo, attemptNo))).map(this::toRecord);
    }
    @Override public Optional<JobExecutionRecord> findByExternalJobId(String id) {
        if (id == null || id.trim().isEmpty()) return Optional.empty();
        return Optional.ofNullable(mapper.selectOne(new LambdaQueryWrapper<JobExecutionEntity>().eq(JobExecutionEntity::getExternalJobId, id))).map(this::toRecord);
    }
    private JobExecutionEntity toEntity(JobExecutionRecord r) { JobExecutionEntity e = new JobExecutionEntity(); e.setId(r.id()); e.setInstanceId(r.instanceId()); e.setAttemptNo(r.attemptNo()); e.setEngineType(r.engineType()); e.setEngineEndpointId(r.engineEndpointId()); e.setExternalJobId(r.externalJobId()); e.setSubmissionStatus(r.submissionStatus()); e.setExecutionStatus(r.executionStatus()); e.setSubmittingAt(date(r.submittingAt())); e.setSubmittedAt(date(r.submittedAt())); e.setStartedAt(date(r.startedAt())); e.setCancellingAt(date(r.cancellingAt())); e.setCanceledAt(date(r.canceledAt())); e.setFinishedAt(date(r.finishedAt())); e.setLastSyncedAt(date(r.lastSyncedAt())); e.setErrorCode(r.errorCode()); e.setErrorMessage(r.errorMessage()); e.setEngineSnapshot(r.engineSnapshot()); e.setCreatedBy(r.createdBy()); e.setUpdatedBy(r.updatedBy()); e.setCreateTime(date(r.createdAt())); e.setUpdateTime(date(r.updatedAt())); return e; }
    private JobExecutionRecord toRecord(JobExecutionEntity e) { return new JobExecutionRecord(e.getId(), e.getInstanceId(), e.getAttemptNo(), e.getEngineType(), e.getEngineEndpointId(), e.getExternalJobId(), e.getSubmissionStatus(), e.getExecutionStatus(), instant(e.getCreateTime()), instant(e.getSubmittingAt()), instant(e.getSubmittedAt()), instant(e.getStartedAt()), instant(e.getCancellingAt()), instant(e.getCanceledAt()), instant(e.getFinishedAt()), instant(e.getLastSyncedAt()), e.getErrorCode(), e.getErrorMessage(), e.getEngineSnapshot(), e.getCreatedBy(), e.getUpdatedBy(), instant(e.getUpdateTime())); }
    private static Date date(Instant value) { return value == null ? null : Date.from(value); } private static Instant instant(Date value) { return value == null ? null : value.toInstant(); }
}
