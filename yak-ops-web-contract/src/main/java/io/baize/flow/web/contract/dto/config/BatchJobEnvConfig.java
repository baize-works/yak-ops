package io.baize.flow.web.contract.dto.config;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class BatchJobEnvConfig extends JobEnvConfig {
}
