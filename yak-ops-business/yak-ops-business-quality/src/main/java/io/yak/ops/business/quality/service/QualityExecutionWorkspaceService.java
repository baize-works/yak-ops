package io.yak.ops.business.quality.service;

import io.yak.ops.business.quality.api.QualityApi.CheckResult;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.ExecutionLogLine;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.ExecutionLogView;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.ExecutionPageRequest;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.ExecutionPageView;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.ExecutionView;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.LogLevel;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.RuleExecutionListItem;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.RuleExecutionPageView;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.RuleExecutionView;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.repository.QualityExecutionWorkspaceRepository;
import io.yak.ops.business.quality.repository.QualityExecutionWorkspaceRepository.PageResult;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@ConditionalOnQualityEnabled
@Service
public class QualityExecutionWorkspaceService {

  private final QualityExecutionWorkspaceRepository repository;

  public QualityExecutionWorkspaceService(QualityExecutionWorkspaceRepository repository) {
    this.repository = repository;
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public ExecutionPageView page(ExecutionPageRequest request) {
    ExecutionPageRequest normalized = normalize(request);
    PageResult<io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.ExecutionListItem>
        result = repository.page(normalized);
    return new ExecutionPageView(
        result.records(),
        result.total(),
        normalized.normalizedCurrent(),
        normalized.normalizedPageSize());
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public RuleExecutionPageView pageRules(ExecutionPageRequest request) {
    ExecutionPageRequest normalized = normalize(request);
    PageResult<RuleExecutionListItem> result = repository.pageRules(normalized);
    return new RuleExecutionPageView(
        result.records(),
        result.total(),
        normalized.normalizedCurrent(),
        normalized.normalizedPageSize());
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public ExecutionView get(String executionNo) {
    return repository.find(executionNo)
        .orElseThrow(
            () -> new IllegalArgumentException("质量执行记录不存在：" + executionNo));
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public ExecutionLogView logs(String executionNo) {
    ExecutionView execution = get(executionNo);
    List<ExecutionLogLine> lines = new ArrayList<>();
    lines.add(new ExecutionLogLine(
        execution.queuedAt(),
        LogLevel.INFO,
        "DISPATCH",
        "执行任务已创建，触发方式：" + triggerLabel(execution)
            + "，操作人：" + safe(execution.operator())));

    if (execution.startedAt() != null) {
      lines.add(new ExecutionLogLine(
          execution.startedAt(),
          LogLevel.INFO,
          "EXECUTION",
          "开始执行质量检查，共 " + execution.totalRules() + " 条规则"));
    }

    for (RuleExecutionView rule : execution.rules()) {
      lines.add(new ExecutionLogLine(
          fallback(rule.createdAt(), execution.startedAt(), execution.queuedAt()),
          logLevel(rule.checkResult()),
          "RULE",
          ruleMessage(rule)));
    }

    if (execution.errorMessage() != null && !execution.errorMessage().isBlank()) {
      lines.add(new ExecutionLogLine(
          fallback(execution.finishedAt(), execution.startedAt(), execution.queuedAt()),
          LogLevel.ERROR,
          "EXECUTION",
          execution.errorMessage()));
    }

    if (execution.finishedAt() != null) {
      lines.add(new ExecutionLogLine(
          execution.finishedAt(),
          execution.checkResult() == CheckResult.PASSED ? LogLevel.INFO : LogLevel.WARN,
          "FINISH",
          "执行结束：通过 " + execution.passedRules()
              + "，未通过 " + execution.failedRules()
              + "，异常 " + execution.errorRules()
              + "，耗时 " + (execution.durationMs() == null ? 0 : execution.durationMs())
              + " ms"));
    }

    return new ExecutionLogView(execution.executionNo(), List.copyOf(lines));
  }

  private static ExecutionPageRequest normalize(ExecutionPageRequest request) {
    return request == null
        ? new ExecutionPageRequest(
            1, 20, null, null, null, null, null, null, null, null,
            null, null, null, null)
        : request;
  }

  private static String ruleMessage(RuleExecutionView rule) {
    StringBuilder message = new StringBuilder()
        .append("规则「")
        .append(rule.ruleName())
        .append("」")
        .append(resultLabel(rule.checkResult()));
    if (rule.metricValue() != null && !rule.metricValue().isBlank()) {
      message.append("，实际值：").append(rule.metricValue());
    }
    if (rule.expectedValue() != null && !rule.expectedValue().isBlank()) {
      message.append("，期望值：").append(rule.expectedValue());
    }
    if (rule.durationMs() != null) {
      message.append("，耗时：").append(rule.durationMs()).append(" ms");
    }
    if (rule.errorMessage() != null && !rule.errorMessage().isBlank()) {
      message.append("，错误：").append(rule.errorMessage());
    }
    return message.toString();
  }

  private static String resultLabel(CheckResult result) {
    return switch (result) {
      case PASSED -> "通过";
      case NOT_PASSED -> "未通过";
      case ERROR -> "执行异常";
      case RUNNING -> "运行中";
      case NOT_RUN -> "未运行";
    };
  }

  private static LogLevel logLevel(CheckResult result) {
    return switch (result) {
      case PASSED, RUNNING, NOT_RUN -> LogLevel.INFO;
      case NOT_PASSED -> LogLevel.WARN;
      case ERROR -> LogLevel.ERROR;
    };
  }

  private static String triggerLabel(ExecutionView execution) {
    return execution.triggerType().name().equals("SCHEDULE") ? "调度触发" : "手动触发";
  }

  private static String safe(String value) {
    return value == null || value.isBlank() ? "system" : value;
  }

  private static LocalDateTime fallback(LocalDateTime... values) {
    for (LocalDateTime value : values) {
      if (value != null) {
        return value;
      }
    }
    return LocalDateTime.now();
  }
}
