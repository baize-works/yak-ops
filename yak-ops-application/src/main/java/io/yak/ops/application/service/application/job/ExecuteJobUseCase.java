package io.yak.ops.application.service.application.job;

import io.yak.ops.application.service.BatchJobInstanceService;
import io.yak.ops.application.service.application.BatchJobSubmissionUseCase;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.domain.enums.RunMode;
import io.yak.ops.web.contract.vo.JobInstanceVO;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;

/** Creates the execution record before submitting it to an engine. */
@Component
public class ExecuteJobUseCase {
    private final BatchJobInstanceService instances;
    private final BatchJobSubmissionUseCase submission;
    public ExecuteJobUseCase(BatchJobInstanceService instances, BatchJobSubmissionUseCase submission) {
        this.instances = instances; this.submission = submission;
    }
    public Long execute(Long definitionId, RunMode runMode) {
        if (definitionId == null || definitionId <= 0) throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "jobDefinitionId");
        if (runMode == null) throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "runMode");
        JobInstanceVO instance = instances.create(definitionId, runMode);
        try { submission.submit(instance); return instance.getId(); }
        catch (RuntimeException e) { throw e; }
    }
}
