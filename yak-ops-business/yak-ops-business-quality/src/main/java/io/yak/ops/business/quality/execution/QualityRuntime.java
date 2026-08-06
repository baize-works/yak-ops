package io.yak.ops.business.quality.execution;

import io.yak.ops.business.quality.api.QualityApi.AlertLevel;
import io.yak.ops.business.quality.api.QualityApi.ComparisonOperator;
import io.yak.ops.business.quality.api.QualityApi.NotifyChannel;
import io.yak.ops.business.quality.api.QualityApi.RuleFailureAction;
import io.yak.ops.business.quality.api.QualityApi.RuleScope;
import io.yak.ops.business.quality.api.QualityApi.RuleType;
import java.math.BigDecimal;
import java.util.List;

public final class QualityRuntime {

  private QualityRuntime() {
  }

  public record MonitorSnapshot(
      long id,
      String name,
      long dataSourceId,
      String dataSourceName,
      String databaseName,
      String schemaName,
      String tableName,
      String whereClause,
      String owner) {
  }

  public record RuleSnapshot(
      long id,
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
      String customSql) {
  }

  public record ExecutionJob(
      long executionId,
      String executionNo,
      MonitorSnapshot monitor,
      List<RuleSnapshot> rules,
      RuleFailureAction ruleFailureAction,
      boolean notifyEnabled,
      NotifyChannel notifyChannel,
      String notifyTarget,
      AlertLevel alertLevel) {

    public ExecutionJob(
        long executionId,
        String executionNo,
        MonitorSnapshot monitor,
        List<RuleSnapshot> rules) {
      this(
          executionId,
          executionNo,
          monitor,
          rules,
          RuleFailureAction.CONTINUE,
          false,
          NotifyChannel.MESSAGE,
          null,
          AlertLevel.WARNING);
    }
  }
}
