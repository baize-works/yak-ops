package io.yak.ops.infrastructure.alarm.repository.impl;

import javax.annotation.Resource;
import io.yak.ops.infrastructure.alarm.repository.JobInstanceBasic;
import io.yak.ops.infrastructure.alarm.repository.JobInstanceLookup;
import io.yak.ops.common.enums.ReleaseState;
import io.yak.ops.dao.entity.JobDefinitionEntity;
import io.yak.ops.dao.entity.JobInstance;
import io.yak.ops.dao.repository.JobDefinitionDao;
import io.yak.ops.dao.repository.JobInstanceDao;
import org.springframework.stereotype.Component;

/**
 * Looks up basic job instance info from the persisted {@link JobInstance} and
 * its {@link JobDefinitionEntity} release state, to enrich alarm messages and
 * enforce "alarms only for online tasks".
 */
@Component
public class JobInstanceLookupImpl implements JobInstanceLookup {

    @Resource
    private JobInstanceDao jobInstanceDao;

    @Resource
    private JobDefinitionDao jobDefinitionDao;

    @Override
    public JobInstanceBasic lookup(Long jobInstanceId) {
        if (jobInstanceId == null || jobInstanceId <= 0) {
            return null;
        }
        JobInstance instance = jobInstanceDao.queryById(jobInstanceId);
        if (instance == null) {
            return null;
        }

        ReleaseState releaseState = null;
        String jobName = null;
        if (instance.getJobDefinitionId() != null) {
            JobDefinitionEntity definition = jobDefinitionDao.queryById(instance.getJobDefinitionId());
            if (definition != null) {
                releaseState = definition.getReleaseState();
                jobName = definition.getJobName();
            }
        }

        return JobInstanceBasic.builder()
                .jobInstanceId(instance.getId())
                .jobDefinitionId(instance.getJobDefinitionId())
                .jobName(jobName)
                .jobMode(instance.getJobMode() == null ? null : instance.getJobMode().name())
                .engineJobId(instance.getEngineJobId())
                .releaseState(releaseState)
                .build();
    }
}
