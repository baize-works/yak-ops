package io.yak.ops.business.quality.service;

import io.yak.ops.business.quality.api.QualityApi.AlertLevel;
import io.yak.ops.business.quality.api.QualityApi.ComparisonOperator;
import io.yak.ops.business.quality.api.QualityApi.MonitorPageRequest;
import io.yak.ops.business.quality.api.QualityApi.MonitorPageView;
import io.yak.ops.business.quality.api.QualityApi.MonitorSettingsRequest;
import io.yak.ops.business.quality.api.QualityApi.MonitorSettingsView;
import io.yak.ops.business.quality.api.QualityApi.MonitorView;
import io.yak.ops.business.quality.api.QualityApi.NotifyChannel;
import io.yak.ops.business.quality.api.QualityApi.RuleFailureAction;
import io.yak.ops.business.quality.api.QualityApi.RuleScope;
import io.yak.ops.business.quality.api.QualityApi.RuleType;
import io.yak.ops.business.quality.api.QualityApi.RunMode;
import io.yak.ops.business.quality.api.QualityApi.RunView;
import io.yak.ops.business.quality.api.QualityApi.SaveMonitorRequest;
import io.yak.ops.business.quality.api.QualityApi.SaveRuleRequest;
import io.yak.ops.business.quality.api.QualityApi.ScheduleFrequency;
import io.yak.ops.business.quality.api.QualityApi.ScheduleWeekday;
import io.yak.ops.business.quality.api.QualityApi.TableMonitorSummary;
import io.yak.ops.business.quality.api.QualityApi.TemplateView;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.repository.QualityRepository;
import io.yak.ops.business.quality.repository.QualityRepository.MonitorSettingsWrite;
import io.yak.ops.business.quality.repository.QualityRepository.MonitorWrite;
import io.yak.ops.business.quality.repository.QualityRepository.PageResult;
import io.yak.ops.business.quality.repository.QualityRepository.RuleWrite;
import io.yak.ops.business.quality.schedule.QualityScheduleCalculator;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@ConditionalOnQualityEnabled
@Service
public class QualityMonitorService {

  private final QualityRepository repository;
  private final QualityExecutionService executionService;
  private final QualityScheduleCalculator scheduleCalculator;

  public QualityMonitorService(
      QualityRepository repository,
      QualityExecutionService executionService,
      QualityScheduleCalculator scheduleCalculator) {
    this.repository = repository;
    this.executionService = executionService;
    this.scheduleCalculator = scheduleCalculator;
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public MonitorPageView page(MonitorPageRequest request) {
    MonitorPageRequest normalized = request == null
        ? new MonitorPageRequest(1, 20, null, null, null, null, null, null, null)
        : request;
    PageResult<io.yak.ops.business.quality.api.QualityApi.MonitorListItem> result =
        repository.pageMonitors(normalized);
    return new MonitorPageView(
        result.records(), result.total(), normalized.normalizedCurrent(),
        normalized.normalizedPageSize());
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public MonitorView get(long id) {
    return repository.findMonitor(id)
        .orElseThrow(() -> new IllegalArgumentException("质量监控不存在：" + id));
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public MonitorSettingsView getSettings(long id) {
    get(id);
    return repository.findMonitorSettings(id);
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public List<TableMonitorSummary> tableSummaries(
      long dataSourceId, String databaseName, String schemaName) {
    if (dataSourceId <= 0) {
      throw new IllegalArgumentException("数据源编号无效");
    }
    return repository.tableSummaries(dataSourceId, databaseName, schemaName);
  }

  @Transactional(transactionManager = "yakBusinessTransactionManager")
  public MonitorView create(SaveMonitorRequest request) {
    validateTarget(null, request);
    List<RuleWrite> rules = normalizeRules(request.rules());
    MonitorSettingsWrite settings = normalizeSettings(request.settings(), null, request.enabled());
    long id = repository.insertMonitor(toMonitorWrite(request));
    repository.upsertMonitorSettings(id, settings);
    repository.replaceRules(id, rules);
    return get(id);
  }

  @Transactional(transactionManager = "yakBusinessTransactionManager")
  public MonitorView update(long id, SaveMonitorRequest request) {
    get(id);
    validateTarget(id, request);
    List<RuleWrite> rules = normalizeRules(request.rules());
    MonitorSettingsWrite settings = normalizeSettings(
        request.settings(), repository.findMonitorSettings(id), request.enabled());
    if (!repository.updateMonitor(id, toMonitorWrite(request))) {
      throw new IllegalArgumentException("质量监控不存在：" + id);
    }
    repository.upsertMonitorSettings(id, settings);
    repository.replaceRules(id, rules);
    return get(id);
  }

  @Transactional(transactionManager = "yakBusinessTransactionManager")
  public boolean delete(long id) {
    if (repository.hasActiveExecution(id)) {
      throw new IllegalStateException("质量监控正在运行，暂时不能删除");
    }
    if (!repository.deleteMonitor(id)) {
      throw new IllegalArgumentException("质量监控不存在：" + id);
    }
    return true;
  }

  public RunView run(long id, String operator) {
    return executionService.run(id, operator);
  }

  private MonitorSettingsWrite normalizeSettings(
      MonitorSettingsRequest request,
      MonitorSettingsView existing,
      Boolean monitorEnabled) {
    RunMode runMode = request == null
        ? existing == null ? RunMode.MANUAL : existing.runMode()
        : defaultValue(request.runMode(), RunMode.MANUAL);
    ScheduleFrequency frequency = request == null
        ? existing == null ? null : existing.scheduleFrequency()
        : request.scheduleFrequency();
    String scheduleTime = request == null
        ? existing == null ? null : existing.scheduleTime()
        : trimToNull(request.scheduleTime());
    ScheduleWeekday weekday = request == null
        ? existing == null ? null : existing.scheduleWeekday()
        : request.scheduleWeekday();
    String cron = request == null
        ? existing == null ? null : existing.cronExpression()
        : trimToNull(request.cronExpression());
    RuleFailureAction failureAction = request == null
        ? existing == null ? RuleFailureAction.CONTINUE : existing.ruleFailureAction()
        : defaultValue(request.ruleFailureAction(), RuleFailureAction.CONTINUE);
    boolean notifyEnabled = request == null
        ? existing != null && existing.notifyEnabled()
        : Boolean.TRUE.equals(request.notifyEnabled());
    NotifyChannel notifyChannel = request == null
        ? existing == null ? NotifyChannel.MESSAGE : existing.notifyChannel()
        : defaultValue(request.notifyChannel(), NotifyChannel.MESSAGE);
    String notifyTarget = request == null
        ? existing == null ? null : existing.notifyTarget()
        : trimToNull(request.notifyTarget());
    AlertLevel alertLevel = request == null
        ? existing == null ? AlertLevel.WARNING : existing.alertLevel()
        : defaultValue(request.alertLevel(), AlertLevel.WARNING);

    if (runMode == RunMode.MANUAL) {
      frequency = null;
      scheduleTime = null;
      weekday = null;
      cron = null;
    } else {
      if (frequency == null) {
        throw new IllegalArgumentException("调度触发必须选择调度周期");
      }
      switch (frequency) {
        case DAILY -> {
          requireScheduleTime(scheduleTime);
          weekday = null;
          cron = null;
        }
        case WEEKLY -> {
          requireScheduleTime(scheduleTime);
          if (weekday == null) {
            throw new IllegalArgumentException("每周调度必须选择执行日期");
          }
          cron = null;
        }
        case CRON -> {
          scheduleCalculator.validateCron(cron);
          scheduleTime = null;
          weekday = null;
        }
        default -> throw new IllegalArgumentException("不支持的调度周期");
      }
    }

    if (notifyEnabled && notifyChannel != NotifyChannel.MESSAGE && notifyTarget == null) {
      throw new IllegalArgumentException(
          notifyChannel == NotifyChannel.EMAIL
              ? "邮件通知必须填写接收邮箱"
              : "Webhook 通知必须填写回调地址");
    }

    boolean enabled = monitorEnabled == null || monitorEnabled;
    LocalDateTime nextRunTime = enabled
        ? scheduleCalculator.nextRun(
            runMode, frequency, scheduleTime, weekday, cron, LocalDateTime.now())
        : null;
    return new MonitorSettingsWrite(
        runMode, frequency, scheduleTime, weekday, cron, nextRunTime,
        failureAction, notifyEnabled, notifyChannel, notifyTarget, alertLevel);
  }

  private void requireScheduleTime(String scheduleTime) {
    scheduleCalculator.nextRun(
        RunMode.SCHEDULE,
        ScheduleFrequency.DAILY,
        scheduleTime,
        null,
        null,
        LocalDateTime.now());
  }

  private void validateTarget(Long excludeId, SaveMonitorRequest request) {
    if (request.dataSourceId() == null || request.dataSourceId() <= 0) {
      throw new IllegalArgumentException("请选择有效的数据源");
    }
    String tableName = request.tableName().trim();
    if (!repository.existsTableAssetTarget(
        request.dataSourceId(), request.databaseName(), request.schemaName(), tableName)) {
      throw new IllegalStateException("当前数据表尚未注册，请先在按表配置页面注册数据表");
    }
    if (repository.existsMonitorForTarget(
        excludeId, request.dataSourceId(), request.databaseName(),
        request.schemaName(), tableName)) {
      throw new IllegalStateException("当前数据表已经创建质量监控，请直接进入监控详情");
    }
    validateWhereClause(request.whereClause());
  }

  private List<RuleWrite> normalizeRules(List<SaveRuleRequest> requests) {
    if (requests == null || requests.isEmpty()) {
      throw new IllegalArgumentException("至少需要添加一条质量规则");
    }
    List<RuleWrite> result = new ArrayList<>();
    for (SaveRuleRequest request : requests) {
      TemplateView template = repository.findTemplate(request.templateId())
          .orElseThrow(
              () -> new IllegalArgumentException("规则模板不存在：" + request.templateId()));
      String columnName = trimToNull(request.columnName());
      if (template.scope() == RuleScope.COLUMN && columnName == null) {
        throw new IllegalArgumentException(template.name() + " 必须选择检查字段");
      }

      ComparisonOperator operator;
      BigDecimal threshold;
      BigDecimal thresholdEnd = request.thresholdEnd();
      List<String> enumValues = normalizeEnumValues(request.enumValues());
      String customSql = trimToNull(request.customSql());

      if (template.ruleType() == RuleType.COLUMN_RANGE) {
        operator = ComparisonOperator.EQ;
        threshold = required(request.threshold(), template.name() + " 缺少最小值");
        thresholdEnd = required(request.thresholdEnd(), template.name() + " 缺少最大值");
        if (threshold.compareTo(thresholdEnd) > 0) {
          throw new IllegalArgumentException(template.name() + " 最小值不能大于最大值");
        }
      } else if (template.ruleType() == RuleType.COLUMN_ENUM) {
        operator = ComparisonOperator.EQ;
        threshold = BigDecimal.ZERO;
        thresholdEnd = null;
        if (enumValues.isEmpty()) {
          throw new IllegalArgumentException(template.name() + " 至少需要一个允许值");
        }
      } else {
        operator = request.operator() == null
            ? defaultOperator(template.ruleType())
            : ComparisonOperator.fromValue(request.operator());
        threshold = request.threshold() == null
            ? defaultThreshold(template.ruleType())
            : request.threshold();
        if (operator == ComparisonOperator.BETWEEN && thresholdEnd == null) {
          throw new IllegalArgumentException(template.name() + " 缺少区间最大值");
        }
      }

      if (template.ruleType() == RuleType.CUSTOM_SQL) {
        validateCustomSql(customSql);
      } else {
        customSql = null;
      }
      result.add(new RuleWrite(
          template.id(), template.code(), request.name().trim(),
          template.ruleType(), template.scope(), template.dimension(),
          columnName, operator, threshold, thresholdEnd, enumValues,
          customSql, request.enabled() == null || request.enabled()));
    }
    return result;
  }

  private MonitorWrite toMonitorWrite(SaveMonitorRequest request) {
    return new MonitorWrite(
        request.name().trim(), trimToNull(request.description()), request.dataSourceId(),
        request.dataSourceName().trim(), trimToNull(request.databaseName()),
        trimToNull(request.schemaName()), request.tableName().trim(),
        trimToNull(request.whereClause()), request.owner().trim(),
        request.enabled() == null || request.enabled());
  }

  private ComparisonOperator defaultOperator(RuleType ruleType) {
    return switch (ruleType) {
      case TABLE_ROW_COUNT -> ComparisonOperator.GT;
      case COLUMN_NOT_NULL, COLUMN_UNIQUE -> ComparisonOperator.GTE;
      case CUSTOM_SQL, COLUMN_RANGE, COLUMN_ENUM -> ComparisonOperator.EQ;
    };
  }

  private BigDecimal defaultThreshold(RuleType ruleType) {
    return switch (ruleType) {
      case TABLE_ROW_COUNT -> BigDecimal.ZERO;
      case COLUMN_NOT_NULL, COLUMN_UNIQUE -> BigDecimal.valueOf(100);
      case CUSTOM_SQL, COLUMN_RANGE, COLUMN_ENUM -> BigDecimal.ZERO;
    };
  }

  private List<String> normalizeEnumValues(List<String> values) {
    if (values == null) {
      return List.of();
    }
    return values.stream().map(QualityMonitorService::trimToNull)
        .filter(value -> value != null).distinct().toList();
  }

  private void validateWhereClause(String value) {
    String filter = trimToNull(value);
    if (filter == null) {
      return;
    }
    String upper = filter.toUpperCase();
    if (filter.contains(";") || upper.contains("--") || upper.contains("/*")
        || upper.matches("(?s).*\\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE)\\b.*")) {
      throw new IllegalArgumentException("数据范围仅允许填写 WHERE 条件片段");
    }
  }

  private void validateCustomSql(String sql) {
    if (sql == null) {
      throw new IllegalArgumentException("自定义 SQL 不能为空");
    }
    String normalized = sql.trim();
    if (normalized.endsWith(";")) {
      normalized = normalized.substring(0, normalized.length() - 1).trim();
    }
    if (!normalized.toUpperCase().startsWith("SELECT ") || normalized.contains(";")) {
      throw new IllegalArgumentException("自定义 SQL 仅允许执行单条 SELECT 查询");
    }
  }

  private static BigDecimal required(BigDecimal value, String message) {
    if (value == null) {
      throw new IllegalArgumentException(message);
    }
    return value;
  }

  private static <T> T defaultValue(T value, T fallback) {
    return value == null ? fallback : value;
  }

  private static String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
