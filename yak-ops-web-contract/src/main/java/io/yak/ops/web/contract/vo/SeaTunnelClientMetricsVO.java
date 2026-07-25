package io.yak.ops.web.contract.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class SeaTunnelClientMetricsVO {
    private Double cpuUsage;

    private Double memoryUsage;

    private Integer threadCount;

    private Integer runningOps;
}
