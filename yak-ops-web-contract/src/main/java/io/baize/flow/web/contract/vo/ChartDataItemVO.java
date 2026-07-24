package io.baize.flow.web.contract.vo;

import lombok.Data;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class ChartDataItemVO {
    private String date;
    private Double value;
    private String unit;
}
