package io.yak.ops.business.quality.api;

import io.yak.ops.business.quality.api.QualityApi.ComparisonOperator;
import io.yak.ops.business.quality.api.QualityApi.RuleScope;
import io.yak.ops.business.quality.api.QualityApi.RuleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class CustomTemplateApi {

  private CustomTemplateApi() {
  }

  public enum CheckType { NUMERIC }
  public enum CheckMethod { FIXED_VALUE }

  public record Query(String keyword, String dimension, Long folderId) {}

  public record TemplateView(
      Long id,
      String code,
      String name,
      String description,
      RuleType ruleType,
      RuleScope scope,
      String dimension,
      String parameterSchema,
      boolean builtin,
      boolean enabled,
      long ruleCount,
      int sortOrder,
      Long folderId,
      String folderName,
      String templateSql,
      String setFlag,
      CheckType checkType,
      CheckMethod checkMethod,
      String createdBy,
      LocalDateTime createdAt,
      LocalDateTime updatedAt) {}

  public record Summary(
      long total,
      long systemTotal,
      long customTotal,
      Map<String, Long> dimensions) {}

  public record ListView(List<TemplateView> records, Summary summary) {}

  public record FolderView(
      Long id,
      Long parentId,
      String name,
      int sortOrder,
      long templateCount,
      long childCount,
      LocalDateTime createdAt,
      LocalDateTime updatedAt) {}

  public record SaveFolderRequest(
      @NotBlank @Size(max = 100) String name,
      Long parentId) {}

  public record SaveTemplateRequest(
      @NotBlank @Size(max = 100) String name,
      @Size(max = 500) String description,
      @NotBlank @Size(max = 40) String dimension,
      Long folderId,
      @Size(max = 1000) String setFlag,
      CheckType checkType,
      CheckMethod checkMethod,
      @NotBlank @Size(max = 20000) String customSql,
      ComparisonOperator defaultOperator,
      @NotNull BigDecimal defaultThreshold,
      BigDecimal defaultThresholdEnd) {}

  public record CopyTemplateRequest(
      @NotBlank @Size(max = 100) String name,
      Long folderId) {}
}
