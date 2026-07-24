package io.baize.flow.web.contract.vo;

import lombok.Data;

import java.util.List;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class OverviewChartsVO {
    private List<ChartDataItemVO> recordsTrend;
    private List<ChartDataItemVO> bytesTrend;
    private List<ChartDataItemVO> recordsSpeedTrend;
    private List<ChartDataItemVO> bytesSpeedTrend;
}
