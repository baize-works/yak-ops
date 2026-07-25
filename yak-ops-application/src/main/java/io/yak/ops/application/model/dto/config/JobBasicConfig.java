package io.yak.ops.application.model.dto.config;

import lombok.Data;
import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.plugin.spi.enums.JobRuntimeType;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class JobBasicConfig {

    /**
     * 编辑模式：SCRIPT / GUIDE_SINGLE / GUIDE_MULTI
     */
    private JobDefinitionMode mode;

    /**
     * 运行类型：BATCH
     */
    private JobRuntimeType runtimeType;

    private String jobName;

    private String jobDesc;

    private Long clientId;
}
