package io.yak.ops.application.service.impl;

import io.yak.ops.application.service.BatchJobExecutorService;
import io.yak.ops.application.service.application.job.BatchExecuteJobsUseCase;
import io.yak.ops.domain.enums.RunMode;
import io.yak.ops.application.model.vo.BatchJobOperateResultVO;
import java.util.List;
import org.springframework.stereotype.Service;
/** @deprecated Compatibility facade. New callers should use the job execution use cases. */
@Service
@Deprecated
public class BatchJobExecutorServiceImpl implements BatchJobExecutorService {
 private final BatchExecuteJobsUseCase jobs;
 public BatchJobExecutorServiceImpl(BatchExecuteJobsUseCase jobs) { this.jobs=jobs; }
 public Long jobExecute(Long definitionId, RunMode mode){ return jobs.jobExecute(definitionId, mode); }
 public Long jobPause(Long instanceId){ return jobs.jobPause(instanceId); }
 public BatchJobOperateResultVO batchExecute(List<Long> ids, RunMode mode){ return jobs.batchExecute(ids, mode); }
 public BatchJobOperateResultVO batchPause(List<Long> ids){ return jobs.batchPause(ids); }
}
