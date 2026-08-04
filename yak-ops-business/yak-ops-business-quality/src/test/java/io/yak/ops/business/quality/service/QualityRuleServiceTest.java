package io.yak.ops.business.quality.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import io.yak.ops.business.quality.api.QualityRuleApi.Importance;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleType;
import io.yak.ops.business.quality.api.QualityRuleApi.SaveRuleRequest;
import io.yak.ops.business.quality.api.QualityRuleApi.ScheduleMode;
import io.yak.ops.business.quality.repository.QualityRuleRepository;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class QualityRuleServiceTest {

  private final QualityRuleRepository repository = mock(QualityRuleRepository.class);
  private final QualityRuleService service = new QualityRuleService(repository);

  @Test
  void rejectsColumnRuleWithoutColumn() {
    SaveRuleRequest request = request(
        RuleType.COLUMN_NOT_NULL,
        ">=",
        new BigDecimal("99"),
        null,
        null,
        null);

    assertThrows(
        IllegalArgumentException.class,
        () -> service.create(request, "tester"));
    verifyNoInteractions(repository);
  }

  @Test
  void rejectsInvalidBetweenRange() {
    SaveRuleRequest request = request(
        RuleType.COLUMN_RANGE,
        "BETWEEN",
        new BigDecimal("100"),
        new BigDecimal("10"),
        "age",
        null);

    assertThrows(
        IllegalArgumentException.class,
        () -> service.create(request, "tester"));
    verifyNoInteractions(repository);
  }

  @Test
  void rejectsCustomSqlRuleWithoutSql() {
    SaveRuleRequest request = request(
        RuleType.CUSTOM_SQL,
        "=",
        BigDecimal.ZERO,
        null,
        null,
        null);

    assertThrows(
        IllegalArgumentException.class,
        () -> service.create(request, "tester"));
    verifyNoInteractions(repository);
  }

  private static SaveRuleRequest request(
      RuleType ruleType,
      String operator,
      BigDecimal threshold,
      BigDecimal thresholdEnd,
      String columnName,
      String customSql) {
    return new SaveRuleRequest(
        "测试规则",
        null,
        Importance.NORMAL,
        "1",
        "测试数据源",
        "yak_ops",
        "yak_ops",
        "yak_ops",
        "user_info",
        columnName,
        ruleType,
        operator,
        threshold,
        thresholdEnd,
        ScheduleMode.MANUAL,
        null,
        null,
        true,
        customSql);
  }
}
