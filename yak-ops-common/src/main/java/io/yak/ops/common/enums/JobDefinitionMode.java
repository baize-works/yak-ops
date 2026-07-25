package io.yak.ops.common.enums;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;


@Getter
@AllArgsConstructor
public enum JobDefinitionMode {

    SCRIPT("SCRIPT", "脚本模式"),
    GUIDE_SINGLE("GUIDE_SINGLE", "单表模式"),
    GUIDE_MULTI("GUIDE_MULTI", "多表模式");

    private final String code;
    private final String description;
}
