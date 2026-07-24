package io.baize.flow.domain.exceptions;

import lombok.Data;
import lombok.EqualsAndHashCode;
import io.baize.flow.plugin.spi.enums.Status;

import java.text.MessageFormat;

@Data
@EqualsAndHashCode(callSuper = true)
public class ServiceException extends RuntimeException {

    private int code;

    public ServiceException() {
        this(Status.INTERNAL_SERVER_ERROR_ARGS);
    }

    public ServiceException(Status status) {
        this(status.getCode(), status.getMsg());
    }

    public ServiceException(Status status, Object... formatter) {
        this(status.getCode(), MessageFormat.format(status.getMsg(), formatter));
    }

    public ServiceException(String message) {
        this(Status.INTERNAL_SERVER_ERROR_ARGS, message);
    }

    public ServiceException(int code, String message) {
        this(code, message, null);
    }

    public ServiceException(int code, String message, Exception cause) {
        super(message, cause);
        this.code = code;
    }

    public ServiceException(String message, Exception exception) {
        this(Status.INTERNAL_SERVER_ERROR_ARGS, message, exception);
    }

}
