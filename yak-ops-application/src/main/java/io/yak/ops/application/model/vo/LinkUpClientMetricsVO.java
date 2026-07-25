package io.yak.ops.application.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class LinkUpClientMetricsVO {
    private Double cpuUsage;

    private Double memoryUsage;

    private Integer threadCount;

    private Integer runningOps;
}
