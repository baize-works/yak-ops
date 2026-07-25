package io.yak.ops.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum SyncModeEnum {

    DAG("DAG", "DAG"),
    WHOLE_SYNC("WHOLE_SYNC", "WHOLE_SYNC");

    private final String code;
    private final String description;
}
