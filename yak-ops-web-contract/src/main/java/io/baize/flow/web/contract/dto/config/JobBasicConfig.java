package io.baize.flow.web.contract.dto.config;

import lombok.Data;
import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.plugin.spi.enums.JobRuntimeType;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
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
