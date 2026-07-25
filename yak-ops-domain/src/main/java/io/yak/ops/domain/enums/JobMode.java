package io.yak.ops.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum JobMode {
    BATCH("BATCH", "离线");

    private final String code;
    private final String description;
}
