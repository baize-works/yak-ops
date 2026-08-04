package io.yak.ops.business.quality.controller.v1;

import io.yak.framework.common.Result;
import io.yak.framework.security.web.RequiresPermission;
import io.yak.ops.business.quality.api.QualityRuleApi.RulePageRequest;
import io.yak.ops.business.quality.api.QualityRuleApi.RulePageView;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleView;
import io.yak.ops.business.quality.api.QualityRuleApi.SaveRuleRequest;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.service.QualityRuleService;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@ConditionalOnQualityEnabled
@RestController
@RequestMapping("/api/v1/data-quality/rule")
@RequiresPermission("quality:rule:read")
public class QualityRuleController {

  private final QualityRuleService service;

  public QualityRuleController(QualityRuleService service) {
    this.service = service;
  }

  @PostMapping("/page")
  public Result<RulePageView> page(@Valid @RequestBody RulePageRequest request) {
    return Result.success(service.page(request));
  }

  @GetMapping("/{id}")
  public Result<RuleView> detail(@PathVariable long id) {
    return Result.success(service.get(id));
  }

  @PostMapping
  public Result<RuleView> create(
      @Valid @RequestBody SaveRuleRequest request,
      Principal principal) {
    return Result.success(service.create(request, operator(principal)));
  }

  @PutMapping("/{id}")
  public Result<RuleView> update(
      @PathVariable long id,
      @Valid @RequestBody SaveRuleRequest request,
      Principal principal) {
    return Result.success(service.update(id, request, operator(principal)));
  }

  @PostMapping("/{id}/copy")
  public Result<RuleView> copy(@PathVariable long id, Principal principal) {
    return Result.success(service.copy(id, operator(principal)));
  }

  @PutMapping("/{id}/enable")
  public Result<Boolean> enable(@PathVariable long id) {
    return Result.success(service.setEnabled(id, true));
  }

  @PutMapping("/{id}/disable")
  public Result<Boolean> disable(@PathVariable long id) {
    return Result.success(service.setEnabled(id, false));
  }

  @DeleteMapping("/{id}")
  public Result<Boolean> delete(@PathVariable long id) {
    return Result.success(service.delete(id));
  }

  private static String operator(Principal principal) {
    return principal == null || principal.getName() == null || principal.getName().isBlank()
        ? "system"
        : principal.getName();
  }
}
