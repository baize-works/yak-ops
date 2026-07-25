package io.yak.ops.application.model.vo;

import lombok.Data;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class ChartDataItemVO {
    private String date;
    private Double value;
    private String unit;
}
