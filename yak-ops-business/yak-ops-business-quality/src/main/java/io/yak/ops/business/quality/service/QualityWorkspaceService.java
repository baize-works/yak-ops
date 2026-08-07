package io.yak.ops.business.quality.service;

import io.yak.ops.business.quality.api.QualityApi.MonitorSettingsView;
import io.yak.ops.business.quality.api.QualityApi.MonitorView;
import io.yak.ops.business.quality.api.QualityWorkspaceApi.MonitorReportView;
import io.yak.ops.business.quality.api.QualityWorkspaceApi.MonitorWorkspaceView;
import io.yak.ops.business.quality.api.QualityWorkspaceApi.OperationLogPageView;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.repository.QualityWorkspaceRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@ConditionalOnQualityEnabled
@Service
public class QualityWorkspaceService {

  private final QualityMonitorService monitorService;
  private final QualityWorkspaceRepository repository;

  public QualityWorkspaceService(
      QualityMonitorService monitorService,
      QualityWorkspaceRepository repository) {
    this.monitorService = monitorService;
    this.repository = repository;
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public MonitorWorkspaceView workspace(long monitorId) {
    MonitorView monitor = monitorService.get(monitorId);
    MonitorSettingsView settings = monitorService.getSettings(monitorId);
    return new MonitorWorkspaceView(monitor, settings, repository.stats(monitorId));
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public MonitorReportView report(long monitorId, LocalDate reportDate) {
    monitorService.get(monitorId);
    LocalDate normalizedDate = reportDate == null
        ? LocalDate.now().minusDays(1)
        : reportDate;
    LocalDate trendStartDate = normalizedDate.minusDays(6);
    LocalDateTime reportStart = normalizedDate.atStartOfDay();
    LocalDateTime reportEnd = normalizedDate.plusDays(1).atStartOfDay();
    return new MonitorReportView(
        normalizedDate,
        trendStartDate,
        repository.overview(monitorId, reportStart, reportEnd),
        repository.dimensions(monitorId, reportStart, reportEnd),
        repository.trend(monitorId, trendStartDate.atStartOfDay(), reportEnd),
        repository.columns(monitorId, reportStart, reportEnd));
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public OperationLogPageView operationLogs(
      long monitorId,
      Integer current,
      Integer pageSize) {
    monitorService.get(monitorId);
    int normalizedCurrent = current == null || current < 1 ? 1 : current;
    int normalizedPageSize = pageSize == null ? 10 : Math.min(Math.max(pageSize, 1), 100);
    return new OperationLogPageView(
        repository.operationLogs(monitorId, normalizedCurrent, normalizedPageSize),
        repository.countOperationLogs(monitorId),
        normalizedCurrent,
        normalizedPageSize);
  }
}
