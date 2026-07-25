package io.yak.ops.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class QueryResult implements Serializable {



    private List<FrontedTableColumn> columns;

    private List<Map<String, Object>> data;

    /**
     * 当前查询条件下的数据总量。
     *
     * 注意：
     * - table 模式：表示表总行数
     * - sql 模式：表示 SQL 查询结果总行数
     */
    private Integer total;


    public QueryResult(List<FrontedTableColumn> columns, List<Map<String, Object>> data) {
        this.columns = columns;
        this.data = data;
    }
}
