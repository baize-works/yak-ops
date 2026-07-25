package io.yak.ops.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum EnvironmentEnum {
    DEVELOP("DEVELOP", "开发环境"),
    TEST("TEST", "测试环境"),
    PROD("PROD", "生产环境"),
    ;

    private final String code;
    private final String description;
}
