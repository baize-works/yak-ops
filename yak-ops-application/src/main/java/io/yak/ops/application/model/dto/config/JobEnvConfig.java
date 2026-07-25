package io.yak.ops.application.model.dto.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import io.yak.ops.domain.enums.JobMode;

@Data
@AllArgsConstructor
@NoArgsConstructor
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class JobEnvConfig {

    /**
     * LinkUp env.job.mode
     * BATCH
     */
    private JobMode jobMode;

    private Integer parallelism;
}
