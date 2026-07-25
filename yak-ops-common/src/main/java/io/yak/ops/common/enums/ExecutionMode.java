package io.yak.ops.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum ExecutionMode {
    MANUAL("MANUAL", "手动执行"),
    SCHEDULED("SCHEDULED", "调度执行"),
    CLUSTER("CLUSTER", "集群");

    private final String code;
    private final String description;
}
