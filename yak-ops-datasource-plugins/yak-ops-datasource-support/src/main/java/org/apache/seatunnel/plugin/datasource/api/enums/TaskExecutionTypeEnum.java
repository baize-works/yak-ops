package org.apache.seatunnel.plugin.datasource.api.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.apache.seatunnel.plugin.datasource.api.jdbc.CustomQueryStrategy;
import org.apache.seatunnel.plugin.datasource.api.jdbc.QueryStrategy;
import org.apache.seatunnel.plugin.datasource.api.jdbc.SingleTableStrategy;

@AllArgsConstructor
@Getter
public enum TaskExecutionTypeEnum {
    TABLE("TABLE", "单表同步", new SingleTableStrategy()),
    SQL("SQL", "单表自定义", new CustomQueryStrategy()),
    ;


    public QueryStrategy strategy() {
        return strategy;
    }

    @EnumValue
    private final String code;
    private final String description;
    private final QueryStrategy strategy;
}
