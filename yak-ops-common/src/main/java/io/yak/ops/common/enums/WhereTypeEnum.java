package io.yak.ops.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum WhereTypeEnum {
    DATA("DATA", "数据"),
    TIME("TIME", "时间"),
    ;

    private final String code;
    private final String description;
}
