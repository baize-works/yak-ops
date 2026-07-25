package io.yak.ops.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum RunMode {
    SCHEDULED("SCHEDULED", "SCHEDULED"),
    MANUAL("MANUAL", "MANUAL");

    private final String code;
    private final String description;
}
