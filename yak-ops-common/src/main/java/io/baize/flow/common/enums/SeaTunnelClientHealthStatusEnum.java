package io.baize.flow.common.enums;

public enum SeaTunnelClientHealthStatusEnum {
    LIVE(1, "可用"),
    DEAD(2, "不可用"),
    UNKNOWN(3, "UNKNOWN"),
    ;

    private final int code;
    private final String desc;

    SeaTunnelClientHealthStatusEnum(int code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public int getCode() {
        return code;
    }

    public String getDesc() {
        return desc;
    }
}
