package io.yak.ops.dao.model.query;

import lombok.Data;

/** Persistence pagination criteria for time variables. */
@Data
public class TimeVariablePageQuery {
    private Integer pageNo = 1;
    private Integer pageSize = 10;
    private String keyword;
    private String variableSource;
    private String valueType;
    private Boolean enabled;
}
