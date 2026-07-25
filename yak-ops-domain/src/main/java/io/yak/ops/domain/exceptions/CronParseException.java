package io.yak.ops.domain.exceptions;

public class CronParseException extends Exception {

    public CronParseException(String message) {
        super(message);
    }

    public CronParseException(String message, Throwable throwable) {
        super(message, throwable);
    }
}
