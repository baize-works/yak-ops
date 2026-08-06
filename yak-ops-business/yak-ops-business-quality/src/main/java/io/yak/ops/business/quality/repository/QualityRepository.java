package io.yak.ops.business.quality.repository;

import io.yak.ops.business.quality.api.QualityApi.AlertLevel;
import io.yak.ops.business.quality.api.QualityApi.CheckResult;
import io.yak.ops.business.quality.api.QualityApi.ComparisonOperator;
import io.yak.ops.business.quality.api.QualityApi.ExecutionListItem;
import io.yak.ops.business.quality.api.QualityApi.ExecutionPageRequest;
import io.yak.ops.business.quality.api.QualityApi.ExecutionView;
import io.yak.ops.business.quality.api.QualityApi.MonitorListItem;
import io.yak.ops.business.quality.api.QualityApi.MonitorPageRequest;
import io.yak.ops.business.quality.api.QualityApi.MonitorSettingsView;
import io.yak.ops.business.quality.api.QualityApi.MonitorView;
import io.yak.ops.business.quality.api.QualityApi.NotifyChannel;
import io.yak.ops.business.quality.api.QualityApi.RuleFailureAction;
import io.yak.ops.business.quality.api.QualityApi.RuleScope;
import io.yak.ops.business.quality.api.QualityApi.RuleType;
import io.yak.ops.business.quality.api.QualityApi.RuleView;
import io.yak.ops.business.quality.api.QualityApi.RunMode;
import io.yak.ops.business.quality.api.QualityApi.ScheduleFrequency;
import io.yak.ops.business.quality.api.QualityApi.ScheduleWeekday;
import io.yak.ops.business.quality.api.QualityApi.TableAssetPageRequest;
import io.yak.ops.business.quality.api.QualityApi.TableAssetView;
import io.yak.ops.business.quality.api.QualityApi.TableMonitorSummary;
import io.yak.ops.business.quality.api.QualityApi.TemplateQuery;
import io.yak.ops.business.quality.api.QualityApi.TemplateView;
import io.yak.ops.business.quality.api.QualityApi.TriggerType;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.execution.QualityRuntime.ExecutionJob;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

/** Facade over the template, registered-table, monitor and execution persistence components. */
@ConditionalOnQualityEnabled
@Repository
public class QualityRepository {

  private final QualityTemplateRepository templates;
  private final QualityTableAssetRepository tableAssets;
  private final QualityMonitorRepository monitors;
  private final QualityMonitorSettingsRepository settings;
  private final QualityExecutionRepository executions;

  public QualityRepository(
      QualityTemplateRepository templates,
      QualityTableAssetRepository tableAssets,
      QualityMonitorRepository monitors,
      QualityMonitorSettingsRepository settings,
      QualityExecutionRepository executions) {
    this.templates = templates;
    this.tableAssets = tableAssets;
    this.monitors = monitors;
    this.settings = settings;
    this.executions = executions;
  }

  public List<TemplateView> listTemplates(TemplateQuery query) { return templates.list(query); }
  public Optional<TemplateView> findTemplate(long id) { return templates.find(id); }
  public PageResult<TableAssetView> pageTableAssets(TableAssetPageRequest request) { return tableAssets.page(request); }
  public List<TableAssetTarget> listTableAssetTargets(long dataSourceId, String databaseName) { return tableAssets.listTargets(dataSourceId, databaseName); }
  public boolean existsTableAssetTarget(long dataSourceId, String databaseName, String schemaName, String tableName) { return tableAssets.existsTarget(dataSourceId, databaseName, schemaName, tableName); }
  public int registerTableAssets(List<TableAssetWrite> writes) { return tableAssets.register(writes); }
  public int countMonitorsForTableAsset(long assetId) { return tableAssets.countMonitors(assetId); }
  public boolean deleteTableAsset(long assetId) { return tableAssets.delete(assetId); }
  public PageResult<MonitorListItem> pageMonitors(MonitorPageRequest request) { return monitors.page(request); }
  public Optional<MonitorView> findMonitor(long id) { return monitors.find(id); }
  public List<TableMonitorSummary> tableSummaries(long dataSourceId, String databaseName, String schemaName) { return monitors.tableSummaries(dataSourceId, databaseName, schemaName); }
  public boolean existsMonitorForTarget(Long excludeId, long dataSourceId, String databaseName, String schemaName, String tableName) { return monitors.existsForTarget(excludeId, dataSourceId, databaseName, schemaName, tableName); }
  public long insertMonitor(MonitorWrite write) { return monitors.insert(write); }
  public boolean updateMonitor(long id, MonitorWrite write) { return monitors.update(id, write); }
  public boolean deleteMonitor(long id) { return monitors.delete(id); }
  public MonitorSettingsView findMonitorSettings(long monitorId) { return settings.find(monitorId); }
  public void upsertMonitorSettings(long monitorId, MonitorSettingsWrite write) { settings.upsert(monitorId, write); }
  public List<ScheduledMonitor> listDueMonitors(LocalDateTime now, int limit) { return settings.listDue(now, limit); }
  public boolean claimMonitorSchedule(long monitorId, LocalDateTime expectedRunTime, LocalDateTime nextRunTime) { return settings.claim(monitorId, expectedRunTime, nextRunTime); }
  public void insertAlertEvent(AlertEventWrite write) { settings.insertAlert(write); }
  public void replaceRules(long monitorId, List<RuleWrite> rules) { monitors.replaceRules(monitorId, rules); }
  public List<RuleView> listRules(long monitorId) { return monitors.listRules(monitorId); }

  public ExecutionJob executionJob(long monitorId, long executionId, String executionNo) {
    ExecutionJob job = monitors.executionJob(monitorId, executionId, executionNo);
    MonitorSettingsView value = settings.find(monitorId);
    return new ExecutionJob(
        job.executionId(),
        job.executionNo(),
        job.monitor(),
        job.rules(),
        value.ruleFailureAction(),
        value.notifyEnabled(),
        value.notifyChannel(),
        value.notifyTarget(),
        value.alertLevel());
  }

  public void lockMonitor(long monitorId) { monitors.lock(monitorId); }
  public boolean hasActiveExecution(long monitorId) { return executions.hasActive(monitorId); }

  public long insertExecution(
      String executionNo,
      MonitorView monitor,
      int totalRules,
      String operator,
      TriggerType triggerType,
      LocalDateTime queuedAt) {
    return executions.insert(executionNo, monitor, totalRules, operator, triggerType, queuedAt);
  }

  public boolean markExecutionRunning(long id, LocalDateTime startedAt) { return executions.markRunning(id, startedAt); }
  public void insertRuleExecution(RuleExecutionWrite write) { executions.insertRule(write); }
  public boolean completeExecution(long id, CheckResult result, int passed, int failed, int errors, LocalDateTime finishedAt, long durationMs) { return executions.complete(id, result, passed, failed, errors, finishedAt, durationMs); }
  public boolean failExecution(long id, String errorMessage, LocalDateTime finishedAt, long durationMs) { return executions.fail(id, errorMessage, finishedAt, durationMs); }
  public boolean updateMonitorResult(long monitorId, String executionNo, CheckResult result, LocalDateTime runTime) { return monitors.updateResult(monitorId, executionNo, result, runTime); }
  public PageResult<ExecutionListItem> pageExecutions(ExecutionPageRequest request) { return executions.page(request); }
  public Optional<ExecutionView> findExecution(String executionNo) { return executions.find(executionNo); }

  public record PageResult<T>(List<T> records, long total) {}

  public record TableAssetWrite(
      long dataSourceId,
      String dataSourceName,
      String databaseName,
      String schemaName,
      String tableName,
      String tableType,
      String remarks,
      String registeredBy) {}

  public record TableAssetTarget(String databaseName, String schemaName, String tableName) {}

  public record MonitorWrite(
      String name,
      String description,
      long dataSourceId,
      String dataSourceName,
      String databaseName,
      String schemaName,
      String tableName,
      String whereClause,
      String owner,
      boolean enabled) {}

  public record MonitorSettingsWrite(
      RunMode runMode,
      ScheduleFrequency scheduleFrequency,
      String scheduleTime,
      ScheduleWeekday scheduleWeekday,
      String cronExpression,
      LocalDateTime nextRunTime,
      RuleFailureAction ruleFailureAction,
      boolean notifyEnabled,
      NotifyChannel notifyChannel,
      String notifyTarget,
      AlertLevel alertLevel) {}

  public record ScheduledMonitor(
      long monitorId,
      RunMode runMode,
      ScheduleFrequency scheduleFrequency,
      String scheduleTime,
      ScheduleWeekday scheduleWeekday,
      String cronExpression,
      LocalDateTime expectedRunTime) {}

  public record AlertEventWrite(
      long monitorId,
      String executionNo,
      CheckResult checkResult,
      AlertLevel alertLevel,
      NotifyChannel notifyChannel,
      String notifyTarget,
      String deliveryStatus,
      String alertMessage,
      String errorMessage,
      LocalDateTime createdAt) {}

  public record RuleWrite(
      long templateId,
      String templateCode,
      String name,
      RuleType ruleType,
      RuleScope scope,
      String dimension,
      String columnName,
      ComparisonOperator operator,
      BigDecimal threshold,
      BigDecimal thresholdEnd,
      List<String> enumValues,
      String customSql,
      boolean enabled) {}

  public record RuleExecutionWrite(
      long executionId,
      long ruleId,
      String ruleName,
      String templateCode,
      RuleType ruleType,
      String columnName,
      CheckResult checkResult,
      String metricValue,
      String expectedValue,
      String executedSql,
      String errorMessage,
      long durationMs) {}
}
