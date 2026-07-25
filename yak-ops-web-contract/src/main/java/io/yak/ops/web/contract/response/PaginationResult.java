package io.yak.ops.web.contract.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import io.yak.ops.common.constants.PaginationConstant;
import io.yak.ops.web.contract.dto.pagination.PaginationBaseDTO;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;


@Data
@EqualsAndHashCode(callSuper = true)
@ToString
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class PaginationResult<T> extends BaseResult {

    private static final long serialVersionUID = -7850208355453831640L;

    @Schema(description = "Response data")
    private PaginationData<T> data;


    private PaginationResult(PaginationBaseDTO dto) {
        this.data = new PaginationData<>();

        if (dto != null) {
            this.data.setPagination(new Pagination(0, dto.getPageNo(), dto.getPageSize()));
        } else {
            this.data.setPagination(new Pagination(0, PaginationConstant.DEFAULT_PAGE_NO, PaginationConstant.DEFAULT_PAGE_SIZE));
        }

        this.data.setBizData(java.util.Collections.emptyList());
        this.setCode(ResultStatus.SUCCESS.getCode());
        this.setMessage(ResultStatus.SUCCESS.getMessage());
    }

    public static <T> PaginationResult<T> buildSuc(PaginationBaseDTO dto) {
        return new PaginationResult<>(dto);
    }

    public static <T, U> PaginationResult<T> buildSuc(List<T> dataList, PaginationResult<U> anotherPaginationResult) {
        PaginationResult<T> paginationResult = new PaginationResult<>(null);
        paginationResult.data = new PaginationData<>();
        paginationResult.data.setPagination(anotherPaginationResult.getData().getPagination());
        paginationResult.data.setBizData(dataList);
        return paginationResult;
    }

    public static <T> PaginationResult<T> buildSuc(List<T> bizDataList, long total, long pageNo, long pageSize) {
        PaginationResult<T> paginationResult = PaginationResult.buildSuc(null);

        PaginationData<T> paginationData = new PaginationData<>();
        paginationData.setBizData(bizDataList == null ? new ArrayList<>() : bizDataList);
        paginationData.setPagination(new Pagination(total, pageNo, pageSize));

        paginationResult.setData(paginationData);
        return paginationResult;
    }

    public static <T> PaginationResult<T> buildFailure(ResultStatus rs, PaginationBaseDTO dto) {
        PaginationResult<T> paginationResult = new PaginationResult<>(dto);
        paginationResult.setCode(rs.getCode());
        paginationResult.setMessage(rs.getMessage());
        return paginationResult;
    }

    public static <T, U> PaginationResult<T> buildFailure(Result<U> anotherResult, PaginationBaseDTO dto) {
        PaginationResult<T> paginationResult = new PaginationResult<>(dto);

        paginationResult.setCode(anotherResult.getCode());
        paginationResult.setMessage(anotherResult.getMessage());
        return paginationResult;
    }

    public static <T> PaginationResult<T> buildFailure(String message, PaginationBaseDTO dto) {
        PaginationResult<T> paginationResult = new PaginationResult<>(dto);

        paginationResult.setCode(ResultStatus.FAIL.getCode());
        paginationResult.setMessage(message);
        return paginationResult;
    }

    public static <T, U> PaginationResult<T> buildFailure(PaginationResult<U> anotherPaginationResult, PaginationBaseDTO dto) {
        PaginationResult<T> paginationResult = new PaginationResult<>(dto);

        paginationResult.setCode(anotherPaginationResult.getCode());
        paginationResult.setMessage(anotherPaginationResult.getMessage());
        return paginationResult;
    }

}
