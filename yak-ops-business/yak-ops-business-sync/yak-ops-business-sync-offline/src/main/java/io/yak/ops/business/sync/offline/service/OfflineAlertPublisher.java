package io.yak.ops.business.sync.offline.service;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

/**
 * 将离线任务异常持久化并发布为应用事件，告警渠道可独立订阅。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Component
public class OfflineAlertPublisher {

  private static final Logger LOG = LoggerFactory.getLogger(OfflineAlertPublisher.class);

  private final OfflineExecutionControlRepository repository;
  private final ApplicationEventPublisher eventPublisher;

  public OfflineAlertPublisher(
      OfflineExecutionControlRepository repository,
      ApplicationEventPublisher eventPublisher) {
    this.repository = repository;
    this.eventPublisher = eventPublisher;
  }

  public void publish(OfflineJobExecutionPO execution, String alertType, String message) {
    String level = "LOST".equals(alertType) ? "CRITICAL" : "ERROR";
    boolean created = repository.createAlert(
        execution.getJobDefinitionId(),
        execution.getId(),
        alertType,
        level,
        message,
        execution.getEngineSnapshotJson());
    if (!created) {
      return;
    }
    OfflineExecutionAlertEvent event = new OfflineExecutionAlertEvent(
        execution.getJobDefinitionId(), execution.getId(), alertType, level, message);
    eventPublisher.publishEvent(event);
    LOG.warn(
        "Offline sync alert, definitionId={}, executionId={}, type={}, message={}",
        execution.getJobDefinitionId(), execution.getId(), alertType, message);
  }

  public static final class OfflineExecutionAlertEvent {
    private final Long definitionId;
    private final Long executionId;
    private final String alertType;
    private final String level;
    private final String message;

    public OfflineExecutionAlertEvent(
        Long definitionId, Long executionId, String alertType, String level, String message) {
      this.definitionId = definitionId;
      this.executionId = executionId;
      this.alertType = alertType;
      this.level = level;
      this.message = message;
    }

    public Long getDefinitionId() { return definitionId; }
    public Long getExecutionId() { return executionId; }
    public String getAlertType() { return alertType; }
    public String getLevel() { return level; }
    public String getMessage() { return message; }
  }
}
