package io.yak.ops.business.quality.execution;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.yak.ops.business.datasource.service.DataSourceCatalogService;
import io.yak.ops.business.quality.api.QualityRuleApi.ComparisonOperator;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleType;
import io.yak.ops.business.quality.repository.QualityExecutionRepository.ExecutionRuntime;
import io.yak.ops.common.bean.vo.datasource.DataSourceQueryResultVO;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class QualitySqlCompilerTest {

  @Test
  void compilesQuotedColumnMetricAndReadsAliasCaseInsensitively() {
    DataSourceCatalogService catalogService = mock(DataSourceCatalogService.class);
    when(catalogService.buildSqlTemplate(12L, Map.of("table_path", "demo.users")))
        .thenReturn("SELECT `id`, `phone`\nFROM `demo`.`users`");
    QualitySqlCompiler compiler = new QualitySqlCompiler(catalogService);
    ExecutionRuntime runtime = new ExecutionRuntime(
        1L,
        "QE-1",
        8L,
        "12",
        "demo",
        null,
        "demo",
        "users",
        "phone",
        RuleType.COLUMN_NOT_NULL,
        ComparisonOperator.GTE,
        new BigDecimal("99"),
        null,
        "%",
        null,
        ">= 99%");

    QualitySqlCompiler.CompiledQuery query = compiler.compile(runtime);
    assertThat(query.sql())
        .contains("`phone` IS NOT NULL")
        .contains("FROM `demo`.`users`");

    DataSourceQueryResultVO result = new DataSourceQueryResultVO();
    result.setData(List.of(Map.of("METRIC_VALUE", new BigDecimal("99.5"))));
    assertThat(compiler.measure(query, result).displayValue()).isEqualTo("99.5%");
  }
}
