package io.yak.ops.business.job.schedule.offline;

import io.yak.framework.schedule.api.ScheduleExecutionContext;
import io.yak.framework.schedule.api.ScheduleExecutionResult;
import io.yak.framework.schedule.api.ScheduleHandler;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.service.OfflineJobExecutionService;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionVO;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Quartz 触发离线同步任务后的统一业务入口。
 */
@Component(OfflineSyncScheduleConstants.HANDLER_NAME)
@ConditionalOnOfflineSyncEnabled
@ConditionalOnProperty(
    prefix = "yak.job.schedule",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true)
public class OfflineSyncScheduleHandler implements ScheduleHandler {

  private final OfflineJobExecutionService executionService;

  public OfflineSyncScheduleHandler(OfflineJobExecutionService executionService) {
    this.executionService = executionService;
  }

  @Override
  public ScheduleExecutionResult execute(ScheduleExecutionContext context) {
    Long definitionId =
        context.requiredLong(OfflineSyncScheduleConstants.PAYLOAD_DEFINITION_ID);
    OfflineJobExecutionVO execution = executionService.executeScheduled(definitionId);
    return ScheduleExecutionResult.accepted(
        execution == null || execution.getId() == null
            ? null
            : execution.getId().toString(),
        "离线同步任务已提交");
  }
}
