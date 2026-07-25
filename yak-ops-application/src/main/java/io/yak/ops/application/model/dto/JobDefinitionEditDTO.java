package io.yak.ops.application.model.dto;

import lombok.Data;
import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.application.model.dto.config.JobBasicConfig;
import io.yak.ops.application.model.dto.config.JobScheduleConfig;

import java.util.Map;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class JobDefinitionEditDTO {

    private Long id;

    /**
     * GUIDE_SINGLE / GUIDE_MULTI / SCRIPT
     */
    private JobDefinitionMode mode;

    /**
     * 基础配置，来自 job_definition 主表
     */
    private JobBasicConfig basic;

    /**
     * 可视化模式下的工作流原始结构
     */
    private Map<String, Object> workflow;

    /**
     * 调度配置，来自 job_schedule 表
     */
    private JobScheduleConfig schedule;
}
