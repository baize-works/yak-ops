package io.yak.ops.business.quality.service;

import io.yak.ops.business.quality.api.QualityApi.CheckResult;
import io.yak.ops.business.quality.api.QualityApi.NotifyChannel;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.execution.QualityRuntime.ExecutionJob;
import io.yak.ops.business.quality.repository.QualityRepository;
import io.yak.ops.business.quality.repository.QualityRepository.AlertEventWrite;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@ConditionalOnQualityEnabled
@Service
public class QualityAlertService {

  private static final Logger LOGGER = LoggerFactory.getLogger(QualityAlertService.class);

  private final QualityRepository repository;

  public QualityAlertService(QualityRepository repository) {
    this.repository = repository;
  }

  public void recordIfNecessary(
      ExecutionJob job,
      String executionNo,
      CheckResult result,
      int passed,
      int failed,
      int errors) {
    if (!job.notifyEnabled()
        || result == CheckResult.PASSED
        || result == CheckResult.RUNNING
        || result == CheckResult.NOT_RUN) {
      return;
    }
    try {
      String target = normalizeTarget(job);
      String status = job.notifyChannel() == NotifyChannel.MESSAGE
          ? "RECORDED"
          : "PENDING";
      String message = "质量监控“" + job.monitor().name() + "”执行结果为 " + result
          + "，通过 " + passed + " 条，未通过 " + failed + " 条，异常 " + errors + " 条。";
      repository.insertAlertEvent(new AlertEventWrite(
          job.monitor().id(),
          executionNo,
          result,
          job.alertLevel(),
          job.notifyChannel(),
          target,
          status,
          message,
          null,
          LocalDateTime.now()));
      LOGGER.warn(
          "Quality alert recorded: monitor={}, execution={}, result={}, channel={}, target={}",
          job.monitor().id(), executionNo, result, job.notifyChannel(), target);
    } catch (RuntimeException exception) {
      LOGGER.error(
          "Failed to record quality alert for monitor {} and execution {}",
          job.monitor().id(), executionNo, exception);
    }
  }

  private String normalizeTarget(ExecutionJob job) {
    if (job.notifyTarget() != null && !job.notifyTarget().isBlank()) {
      return job.notifyTarget().trim();
    }
    return job.monitor().owner();
  }
}
