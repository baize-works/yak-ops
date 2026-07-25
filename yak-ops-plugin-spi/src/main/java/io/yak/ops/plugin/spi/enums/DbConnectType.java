package io.yak.ops.plugin.spi.enums;

import lombok.Getter;
import io.yak.ops.plugin.spi.form.FormOptionEnum;

@Getter
public enum DbConnectType implements FormOptionEnum {

    ORACLE_SERVICE_NAME(0, "Oracle Service Name"),
    ORACLE_SID(1, "Oracle SID");

    private final int code;

    private final String desc;

    DbConnectType(int code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    @Override
    public String getLabel() {
        return desc;
    }
}
