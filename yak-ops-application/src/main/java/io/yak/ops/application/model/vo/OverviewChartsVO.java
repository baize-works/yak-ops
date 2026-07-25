package io.yak.ops.application.model.vo;

import lombok.Data;

import java.util.List;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class OverviewChartsVO {
    private List<ChartDataItemVO> recordsTrend;
    private List<ChartDataItemVO> bytesTrend;
    private List<ChartDataItemVO> recordsSpeedTrend;
    private List<ChartDataItemVO> bytesSpeedTrend;
}
