package io.baize.flow.application.service.support;

import io.baize.flow.domain.enums.JobMode;
import io.baize.flow.domain.enums.JobStatus;
import io.baize.flow.domain.enums.RunMode;
import io.baize.flow.dao.entity.JobInstance;
import io.baize.flow.web.contract.dto.command.JobDefinitionSaveCommand;
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
