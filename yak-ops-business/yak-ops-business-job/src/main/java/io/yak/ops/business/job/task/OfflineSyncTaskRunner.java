package io.yak.ops.business.job.task;

import io.yak.ops.business.sync.offline.service.OfflineJobExecutionService;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionDetailVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionVO;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

/** 使用现有离线同步执行服务实现工作流 SYNC 任务执行。 */
@Service
public class OfflineSyncTaskRunner implements SyncTaskRunner {

  private final ObjectProvider<OfflineJobExecutionService> executionServiceProvider;

  public OfflineSyncTaskRunner(
      ObjectProvider<OfflineJobExecutionService> executionServiceProvider) {
    this.executionServiceProvider = executionServiceProvider;
  }

  @Override
  public SyncTaskExecution start(String taskId) {
    OfflineJobExecutionVO execution = service().execute(parseId(taskId, "taskId"));
    return toExecution(execution);
  }

  @Override
  public SyncTaskExecution status(String executionId) {
    OfflineJobExecutionDetailVO detail = service().detail(parseId(executionId, "executionId"));
    OfflineJobExecutionVO execution = detail.getSummary() != null
        ? detail.getSummary()
        : detail.getExecution();
    if (execution == null) {
      throw new IllegalStateException("同步任务执行详情为空：" + executionId);
    }
    return toExecution(execution);
  }

  @Override
  public void cancel(String executionId) {
    service().cancel(parseId(executionId, "executionId"));
  }

  private OfflineJobExecutionService service() {
    OfflineJobExecutionService service = executionServiceProvider.getIfAvailable();
    if (service == null) {
      throw new IllegalStateException("离线同步能力未启用，无法执行 SYNC 任务");
    }
    return service;
  }

  private SyncTaskExecution toExecution(OfflineJobExecutionVO execution) {
    Map<String, Object> output = new LinkedHashMap<>();
    put(output, "engineJobId", execution.getEngineJobId());
    put(output, "externalExecutionId", execution.getExternalExecutionId());
    output.put("sourceRecordCount", execution.getSourceRecordCount());
    output.put("sinkCommittedRecordCount", execution.getSinkCommittedRecordCount());
    output.put("failedRecordCount", execution.getFailedRecordCount());
    output.put("durationMillis", execution.getDurationMillis());
    return new SyncTaskExecution(
        String.valueOf(execution.getId()),
        execution.getStatus(),
        execution.getErrorMessage(),
        output);
  }

  private void put(Map<String, Object> target, String key, Object value) {
    if (value != null) {
      target.put(key, value);
    }
  }

  private Long parseId(String value, String name) {
    try {
      long parsed = Long.parseLong(value);
      if (parsed <= 0L) {
        throw new NumberFormatException(value);
      }
      return parsed;
    } catch (RuntimeException exception) {
      throw new IllegalArgumentException(name + " 不合法：" + value, exception);
    }
  }
}
