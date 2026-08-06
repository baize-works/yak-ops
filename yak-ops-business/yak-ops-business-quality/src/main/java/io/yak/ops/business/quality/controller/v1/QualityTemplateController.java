package io.yak.ops.business.quality.controller.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.yak.framework.common.Result;
import io.yak.framework.security.web.RequiresPermission;
import io.yak.ops.business.quality.QualityPermissionCode;
import io.yak.ops.business.quality.api.QualityApi.RuleScope;
import io.yak.ops.business.quality.api.QualityApi.TemplateListView;
import io.yak.ops.business.quality.api.QualityApi.TemplateQuery;
import io.yak.ops.business.quality.api.QualityApi.TemplateView;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.service.QualityTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "数据质量规则模板")
@RestController
@ConditionalOnQualityEnabled
@RequiredArgsConstructor
@RequestMapping("/api/v1/data-quality/template")
@RequiresPermission(QualityPermissionCode.TEMPLATE_READ)
public class QualityTemplateController {

  private final QualityTemplateService service;

  @Operation(summary = "查询规则模板")
  @GetMapping
  public Result<TemplateListView> list(
      @RequestParam(value = "keyword", required = false) String keyword,
      @RequestParam(value = "dimension", required = false) String dimension,
      @RequestParam(value = "scope", required = false) RuleScope scope) {
    return Result.success(service.list(new TemplateQuery(keyword, dimension, scope)));
  }

  @Operation(summary = "查询规则模板详情")
  @GetMapping("/{id}")
  public Result<TemplateView> detail(@PathVariable long id) {
    return Result.success(service.get(id));
  }
}
