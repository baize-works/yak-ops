package io.yak.ops.application.model.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "分页数据")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class PaginationData<T> {

    @Schema(description = "业务数据")
    private List<T> bizData;

    @Schema(description = "分页信息")
    private Pagination pagination;
}
