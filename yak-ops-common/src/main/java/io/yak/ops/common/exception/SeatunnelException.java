package io.yak.ops.common.exception;

public class SeatunnelException extends RuntimeException {
    private SeatunnelErrorEnum errorEnum;

    public SeatunnelException(SeatunnelErrorEnum e) {
        super(e.getMsg());
        this.errorEnum = e;
    }

    public SeatunnelException(SeatunnelErrorEnum e, Object... msg) {
        super(String.format(e.getTemplate(), msg));
        this.errorEnum = e;
    }

    public static SeatunnelException newInstance(SeatunnelErrorEnum e, Object... msg) {
        return new SeatunnelException(e, msg);
    }

    public static SeatunnelException newInstance(SeatunnelErrorEnum e) {
        return new SeatunnelException(e);
    }

    public SeatunnelErrorEnum getErrorEnum() {
        return errorEnum;
    }
}
