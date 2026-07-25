package io.yak.ops.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;


@AllArgsConstructor
@Getter
public enum ConnStatus {
    CONNECTED_SUCCESS("CONNECTED_SUCCESS", "已连接"),
    CONNECTED_FAILED("CONNECTED_FAILED", "连接失败"),
    CONNECTING("CONNECTING", "连接中"),
    CONNECTED_NONE("CONNECTED_NONE", "未连接");

    private final String code;
    private final String description;

    public static ConnStatus of(String code) {
        for (ConnStatus status : values()) {
            if (status.code.equals(code)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown ConnStatus: " + code);
    }
}
