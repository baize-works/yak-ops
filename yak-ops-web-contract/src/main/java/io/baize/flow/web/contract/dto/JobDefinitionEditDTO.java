package io.baize.flow.web.contract.dto;

import lombok.Data;
import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.web.contract.dto.config.JobBasicConfig;
import io.baize.flow.web.contract.dto.config.JobScheduleConfig;

import java.util.Map;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
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