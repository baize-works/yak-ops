package io.baize.flow.web.contract.response;

import lombok.Data;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
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
