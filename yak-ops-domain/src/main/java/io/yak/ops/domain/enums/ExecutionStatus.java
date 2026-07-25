package io.yak.ops.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum ExecutionStatus {
    STARTING("DRAFT", "启动中"),
    RUNNING("ENABLED", "运行中"),
    SUCCESS("DISABLED", "成功"),
    FAILED("DELETED", "失败"),
    STOPPED("DELETED", "已停止");

    private final String code;
    private final String description;
}
