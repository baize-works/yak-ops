package io.yak.ops.domain.exceptions;

import java.text.MessageFormat;

/** Application-visible exception carrying a domain-owned error contract. */
public class ServiceException extends RuntimeException {
    private final int code;
    public ServiceException() { this(DomainErrors.INTERNAL_SERVER_ERROR); }
    public ServiceException(DomainErrorCode error) { this(error.getCode(), error.getMsg()); }
    public ServiceException(DomainErrorCode error, Object... formatter) {
        this(error.getCode(), MessageFormat.format(error.getMsg(), formatter));
    }
    public ServiceException(String message) { this(DomainErrors.INTERNAL_SERVER_ERROR, message); }
    public ServiceException(int code, String message) { this(code, message, null); }
    public ServiceException(int code, String message, Exception cause) { super(message, cause); this.code = code; }
    public ServiceException(String message, Exception cause) {
        this(DomainErrors.INTERNAL_SERVER_ERROR.getCode(), message, cause);
    }
    public int getCode() { return code; }
}
