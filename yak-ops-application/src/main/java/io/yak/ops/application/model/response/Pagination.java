package io.yak.ops.application.model.response;

import lombok.Data;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class Pagination {
    private long total;

    private long pageNo;

    private long pageSize;

    public Pagination(long total, long pageNo, long pageSize) {
        this.total = total;
        this.pageNo = pageNo;
        this.pageSize = pageSize;
    }
}
