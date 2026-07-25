package io.yak.ops.domain.enums;


import lombok.Getter;

@Getter
public enum TaskExecutionStatus {
    STARTING("STARTING","启动中"),
    RUNNING("RUNNING","运行中"),
    COMPLETED("COMPLETED","已完成"),
    FAILED("FAILED","失败"),
    CANCELLED("CANCELLED","已取消"),
    UNKNOWN("UNKNOWN","未知");

    private final String code;
    private final String description;

    TaskExecutionStatus(String code,String description) {
        this.description = description;
        this.code = code;
    }

    public boolean isFinalStatus() {
        return this == COMPLETED || this == FAILED || this == CANCELLED;
    }
}
