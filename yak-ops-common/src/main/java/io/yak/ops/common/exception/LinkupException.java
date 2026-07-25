package io.yak.ops.common.exception;

public class LinkupException extends RuntimeException {
    private LinkupErrorEnum errorEnum;

    public LinkupException(LinkupErrorEnum e) {
        super(e.getMsg());
        this.errorEnum = e;
    }

    public LinkupException(LinkupErrorEnum e, Object... msg) {
        super(String.format(e.getTemplate(), msg));
        this.errorEnum = e;
    }

    public static LinkupException newInstance(LinkupErrorEnum e, Object... msg) {
        return new LinkupException(e, msg);
    }

    public static LinkupException newInstance(LinkupErrorEnum e) {
        return new LinkupException(e);
    }

    public LinkupErrorEnum getErrorEnum() {
        return errorEnum;
    }
}
