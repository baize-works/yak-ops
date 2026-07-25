package io.yak.ops.application.model.vo;

import lombok.Data;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class OverviewSummaryVO {
    private long totalRecords;
    private long totalBytes;
    private long totalTasks;
    private long successTasks;
    private String totalRecordsUnit;
    private String totalBytesUnit;

}
