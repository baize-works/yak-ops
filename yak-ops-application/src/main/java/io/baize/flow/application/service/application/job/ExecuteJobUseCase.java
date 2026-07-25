package io.baize.flow.application.service.application.job;

import io.baize.flow.application.service.BatchJobInstanceService;
import io.baize.flow.application.service.application.BatchJobSubmissionUseCase;
import io.baize.flow.domain.exceptions.ServiceException;
import io.baize.flow.domain.enums.RunMode;
import io.baize.flow.web.contract.vo.JobInstanceVO;
import io.baize.flow.plugin.spi.enums.Status;
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
