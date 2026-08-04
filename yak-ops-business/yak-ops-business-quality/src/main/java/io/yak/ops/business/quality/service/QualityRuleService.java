package io.yak.ops.business.quality.service;

import io.yak.ops.business.quality.api.QualityRuleApi.ComparisonOperator;
import io.yak.ops.business.quality.api.QualityRuleApi.RulePageRequest;
import io.yak.ops.business.quality.api.QualityRuleApi.RulePageView;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleScope;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleType;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleView;
import io.yak.ops.business.quality.api.QualityRuleApi.SaveRuleRequest;
import io.yak.ops.business.quality.api.QualityRuleApi.ScheduleMode;
import io.yak.ops.business.quality.repository.QualityRuleRepository;
import io.yak.ops.business.quality.repository.QualityRuleRepository.PageResult;
import io.yak.ops.business.quality.repository.QualityRuleRepository.RuleWrite;
import java.math.BigDecimal;
import org.springframework.transaction.annotation.Transactional;

public class QualityRuleService {

  private final QualityRuleRepository repository;

  public QualityRuleService(QualityRuleRepository repository) {
    this.repository = repository;
  }

  @Transactional(readOnly = true, transactionManager = "qualityTransactionManager")
  public RulePageView page(RulePageRequest request) {
    PageResult result = repository.page(request);
    return new RulePageView(
        result.records(),
        result.total(),
        request.normalizedCurrent(),
        request.normalizedPageSize(),
        repository.summary());
  }

  @Transactional(readOnly = true, transactionManager = "qualityTransactionManager")
  public RuleView get(long id) {
    return requireRule(id);
  }

  @Transactional(transactionManager = "qualityTransactionManager")
  public RuleView create(SaveRuleRequest request, String operator) {
    RuleWrite write = normalize(request, operator);
    return requireRule(repository.insert(write));
  }

  @Transactional(transactionManager = "qualityTransactionManager")
  public RuleView update(long id, SaveRuleRequest request, String operator) {
    requireRule(id);
    if (!repository.update(id, normalize(request, operator))) {
      throw notFound(id);
    }
    return requireRule(id);
  }

  @Transactional(transactionManager = "qualityTransactionManager")
  public RuleView copy(long id, String operator) {
    RuleView source = requireRule(id);
    SaveRuleRequest request = new SaveRuleRequest(
        copyName(source.name()),
        source.description(),
        source.importance(),
        source.dataSourceId(),
        source.dataSourceName(),
        source.catalogName(),
        source.schemaName(),
        source.databaseName(),
        source.tableName(),
        source.columnName(),
        source.ruleType(),
        source.operator(),
        source.threshold(),
        source.thresholdEnd(),
        source.scheduleMode(),
        source.schedulePreset(),
        source.cronExpression(),
        false,
        source.customSql());
    return create(request, operator);
  }

  @Transactional(transactionManager = "qualityTransactionManager")
  public boolean setEnabled(long id, boolean enabled) {
    requireRule(id);
    if (!repository.setEnabled(id, enabled)) {
      throw notFound(id);
    }
    return true;
  }

  @Transactional(transactionManager = "qualityTransactionManager")
  public boolean delete(long id) {
    requireRule(id);
    if (!repository.delete(id)) {
      throw notFound(id);
    }
    return true;
  }

  private RuleWrite normalize(SaveRuleRequest request, String owner) {
    RuleType ruleType = request.ruleType();
    RuleScope scope = ruleType.scope();
    String columnName = trimToNull(request.columnName());
    if (scope == RuleScope.COLUMN && columnName == null) {
      throw new IllegalArgumentException("字段级质量规则必须选择检查字段");
    }
    if (scope == RuleScope.TABLE) {
      columnName = null;
    }

    ComparisonOperator operator = ComparisonOperator.fromSymbol(request.operator());
    BigDecimal thresholdEnd = request.thresholdEnd();
    if (operator == ComparisonOperator.BETWEEN) {
      if (thresholdEnd == null) {
        throw new IllegalArgumentException("区间比较必须填写最大值");
      }
      if (request.threshold().compareTo(thresholdEnd) > 0) {
        throw new IllegalArgumentException("区间最小值不能大于最大值");
      }
    } else {
      thresholdEnd = null;
    }

    String customSql = trimToNull(request.customSql());
    if (ruleType == RuleType.CUSTOM_SQL && customSql == null) {
      throw new IllegalArgumentException("自定义 SQL 规则必须填写检查 SQL");
    }
    if (ruleType != RuleType.CUSTOM_SQL) {
      customSql = null;
    }

    ScheduleValues schedule = schedule(request);
    return new RuleWrite(
        request.name().trim(),
        trimToNull(request.description()),
        request.importance(),
        request.dataSourceId().trim(),
        request.dataSourceName().trim(),
        trimToNull(request.catalogName()),
        trimToNull(request.schemaName()),
        request.databaseName().trim(),
        request.tableName().trim(),
        columnName,
        scope,
        ruleType,
        ruleType.dimension(),
        operator,
        request.threshold(),
        thresholdEnd,
        ruleType.unit(),
        request.scheduleMode(),
        schedule.preset(),
        schedule.cron(),
        request.enabled() == null || request.enabled(),
        customSql,
        owner == null || owner.isBlank() ? "system" : owner.trim());
  }

  private ScheduleValues schedule(SaveRuleRequest request) {
    if (request.scheduleMode() == ScheduleMode.MANUAL) {
      return new ScheduleValues(null, null);
    }
    String preset = trimToNull(request.schedulePreset());
    if (preset == null) {
      throw new IllegalArgumentException("定时执行规则必须选择调度周期");
    }
    String cron = switch (preset) {
      case "HOURLY" -> "0 0 * * * ?";
      case "DAILY_0200" -> "0 0 2 * * ?";
      case "DAILY_0300" -> "0 0 3 * * ?";
      case "EVERY_30_MINUTES" -> "0 0/30 * * * ?";
      case "CUSTOM" -> {
        String customCron = trimToNull(request.cronExpression());
        if (customCron == null) {
          throw new IllegalArgumentException("自定义调度必须填写 Cron 表达式");
        }
        yield customCron;
      }
      default -> throw new IllegalArgumentException("不支持的调度周期：" + preset);
    };
    return new ScheduleValues(preset, cron);
  }

  private RuleView requireRule(long id) {
    return repository.findById(id).orElseThrow(() -> notFound(id));
  }

  private IllegalArgumentException notFound(long id) {
    return new IllegalArgumentException("质量规则不存在：" + id);
  }

  private static String copyName(String name) {
    String suffix = " - 副本";
    int maxBaseLength = 80 - suffix.length();
    String base = name.length() > maxBaseLength ? name.substring(0, maxBaseLength) : name;
    return base + suffix;
  }

  private static String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private record ScheduleValues(String preset, String cron) {
  }
}
