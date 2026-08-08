package io.yak.ops.business.workflow.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 创建工作流基础定义。 */
public record WorkflowDefinitionCreateRequest(
    @NotBlank @Size(max = 100) String name,
    @Size(max = 500) String description) {}
