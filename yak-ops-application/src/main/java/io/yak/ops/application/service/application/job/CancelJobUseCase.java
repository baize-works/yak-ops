package io.yak.ops.application.service.application.job;

import io.yak.ops.application.service.BatchJobInstanceService;
import io.yak.ops.application.service.application.BatchJobSubmissionUseCase;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.dao.entity.JobInstance;
import io.yak.ops.domain.enums.JobStatus;
import io.yak.ops.web.contract.vo.JobInstanceVO;
import io.yak.ops.plugin.spi.enums.Status;
import java.util.Date;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Cancels an engine execution and compensates the persisted execution record on failure. */
@Component
public class CancelJobUseCase {
 private final BatchJobInstanceService instances; private final BatchJobSubmissionUseCase submission;
 public CancelJobUseCase(BatchJobInstanceService instances, BatchJobSubmissionUseCase submission) { this.instances=instances; this.submission=submission; }
 @Transactional(rollbackFor = Exception.class)
 public Long cancel(Long id) {
  if (id == null || id <= 0) throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "jobInstanceId");
  JobInstanceVO instance=instances.selectById(id);
  if (instance == null || instance.getId() == null) throw new ServiceException(Status.BATCH_JOB_INSTANCE_NOT_EXIST);
  if (isTerminal(instance.getJobStatus())) return id;
  try { submission.pause(instance); update(id, JobStatus.CANCELED, "Job was manually paused by user."); return id; }
  catch (Exception e) { update(id, null, "Job pause failed: " + e.getMessage()); if (e instanceof ServiceException) throw (ServiceException) e; throw new ServiceException(Status.JOB_DEFINITION_EXECUTE_ERROR); }
 }
 private void update(Long id, JobStatus status, String message) { JobInstance record=new JobInstance(); record.setId(id); if(status!=null){record.setJobStatus(status);record.setEndTime(new Date());} record.setErrorMessage(message); instances.updateById(record); }
 private boolean isTerminal(String s) { return s != null && ("FINISHED".equalsIgnoreCase(s)||"FAILED".equalsIgnoreCase(s)||"CANCELED".equalsIgnoreCase(s)||"CANCELLED".equalsIgnoreCase(s)||"STOPPED".equalsIgnoreCase(s)); }
}
