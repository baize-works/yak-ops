package io.baize.flow.web.contract.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "分页数据")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class PaginationData<T> {

    @Schema(description = "业务数据")
    private List<T> bizData;

    @Schema(description = "分页信息")
    private Pagination pagination;
}
