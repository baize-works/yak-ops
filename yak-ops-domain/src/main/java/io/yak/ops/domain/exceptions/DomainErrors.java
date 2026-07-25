package io.yak.ops.domain.exceptions;

/** Generic errors used when no more specific outer error classification is supplied. */
public enum DomainErrors implements DomainErrorCode {
    INTERNAL_SERVER_ERROR(10000, "Internal Server Error: {0}");
    private final int code;
    private final String msg;
    DomainErrors(int code, String msg) { this.code = code; this.msg = msg; }
    public int getCode() { return code; }
    public String getMsg() { return msg; }
}
