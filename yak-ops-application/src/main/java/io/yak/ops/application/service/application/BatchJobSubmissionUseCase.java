package io.yak.ops.application.service.application;

import io.yak.ops.application.model.vo.JobInstanceVO;

/**
 * Application-facing port for submitting and cancelling an engine job.
 *
 * <p>The infrastructure module provides the SeaTunnel REST implementation.
 * Keeping this contract here prevents execution use cases from taking a
 * dependency on an HTTP client or engine-specific implementation.</p>
 */
public interface BatchJobSubmissionUseCase {

    void submit(JobInstanceVO instance);

    void pause(JobInstanceVO instance);
}
