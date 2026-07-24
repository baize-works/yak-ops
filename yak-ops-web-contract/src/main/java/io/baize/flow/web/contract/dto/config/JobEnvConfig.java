package io.baize.flow.web.contract.dto.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import io.baize.flow.domain.enums.JobMode;

@Data
@AllArgsConstructor
@NoArgsConstructor
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class JobEnvConfig {

    /**
     * SeaTunnel env.job.mode
     * BATCH
     */
    private JobMode jobMode;

    private Integer parallelism;
}