package io.yak.ops.application.job.assembler;

import io.yak.ops.common.enums.ReleaseState;
import io.yak.ops.common.modal.JobDefinitionAnalysisResult;
import io.yak.ops.dao.entity.JobDefinitionEntity;
import io.yak.ops.application.model.dto.command.JobDefinitionSaveCommand;
import io.yak.ops.application.model.dto.config.JobBasicConfig;
import io.yak.ops.application.model.dto.config.JobEnvConfig;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class BatchJobDefinitionAssembler {

    public JobDefinitionEntity create(JobDefinitionSaveCommand command,
                                      JobDefinitionAnalysisResult analysis) {
        JobBasicConfig basic = command.getBasic();
        JobEnvConfig env = command.getEnv();

        JobDefinitionEntity build = JobDefinitionEntity.builder()
                .jobName(basic.getJobName())
                .jobDesc(basic.getJobDesc())
                .mode(command.getMode())
                .jobType(env.getJobMode())
                .clientId(basic.getClientId())
                .releaseState(ReleaseState.OFFLINE)
                .jobVersion(1)
                .sourceType(analysis.getSourceType())
                .sinkType(analysis.getSinkType())
                .sourceDatasourceId(analysis.getSourceDatasourceId())
                .sinkDatasourceId(analysis.getSinkDatasourceId())
                .sourceTable(analysis.getSourceTable())
                .sinkTable(analysis.getSinkTable())
                .build();
        build.setId(command.getId());
        build.setUpdateTime(new Date());
        build.setCreateTime(new Date());
        return build;
    }

    public void update(JobDefinitionEntity entity,
                       JobDefinitionSaveCommand command,
                       JobDefinitionAnalysisResult analysis,
                       Date now,
                       int nextVersion) {
        JobBasicConfig basic = command.getBasic();
        JobEnvConfig env = command.getEnv();
        entity.setJobName(basic.getJobName());
        entity.setJobDesc(basic.getJobDesc());
        entity.setMode(command.getMode());
        entity.setJobType(env.getJobMode());
        entity.setClientId(basic.getClientId());
        entity.setJobVersion(nextVersion);
        entity.setSourceType(analysis.getSourceType());
        entity.setSinkType(analysis.getSinkType());
        entity.setSourceDatasourceId(analysis.getSourceDatasourceId());
        entity.setSinkDatasourceId(analysis.getSinkDatasourceId());
        entity.setSourceTable(analysis.getSourceTable());
        entity.setSinkTable(analysis.getSinkTable());
        entity.setUpdateTime(now);
        entity.setReleaseState(ReleaseState.OFFLINE);
    }
}
