package io.yak.ops.plugin.spi.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum JobRuntimeType {

    BATCH("BATCH", "离线任务");

    private final String code;

    private final String description;
}
