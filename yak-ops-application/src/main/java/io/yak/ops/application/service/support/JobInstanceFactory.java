package io.yak.ops.application.service.support;

import io.yak.ops.domain.enums.JobMode;
import io.yak.ops.domain.enums.JobStatus;
import io.yak.ops.domain.enums.RunMode;
import io.yak.ops.dao.entity.JobInstance;
import io.yak.ops.application.model.dto.command.JobDefinitionSaveCommand;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class JobInstanceFactory {

    /**
     * Create a new job instance record.
     */
    public JobInstance create(JobDefinitionSaveCommand dto,
                              Long instanceId,
                              String runtimeConfig,
                              RunMode runMode,
                              String logPath, JobMode jobMode) {
        Date now = new Date();

        return JobInstance.builder()
                .id(instanceId)
                .jobDefinitionId(dto.getId())
                .runMode(runMode)
                .jobStatus(JobStatus.RUNNING)
                .clientId(dto.getBasic().getClientId())
                .triggerSource(resolveTriggerSource(runMode))
                .retryCount(0)
                .runtimeConfig(runtimeConfig)
                .jobMode(jobMode)
                .logPath(logPath)
                .submitTime(now)
                .startTime(now)
                .createTime(now)
                .updateTime(now)
                .build();
    }

    /**
     * Resolve trigger source from run mode.
     */
    private String resolveTriggerSource(RunMode runMode) {
        if (runMode == null) {
            return null;
        }
        return runMode.name();
    }
}
