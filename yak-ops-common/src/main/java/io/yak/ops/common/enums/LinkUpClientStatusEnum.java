package io.yak.ops.common.enums;

public enum LinkUpClientStatusEnum {
    ENABLED(1, "启用"),
    DISABLED(2, "停用");

    private final int code;
    private final String desc;

    LinkUpClientStatusEnum(int code, String desc) {
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
