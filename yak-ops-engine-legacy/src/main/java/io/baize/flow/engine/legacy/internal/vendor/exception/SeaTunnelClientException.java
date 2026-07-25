package io.baize.flow.engine.legacy.internal.vendor.exception;

import lombok.Getter;

/**
 * Exception thrown when calling SeaTunnel Engine APIs.
 *
 * <p>This exception wraps the HTTP status code, response body,
 * and the original cause returned from the SeaTunnel Engine client.</p>
 */
@Getter
public class SeaTunnelClientException extends RuntimeException {

    /**
     * HTTP response status code.
     */
    private final int httpStatus;

    /**
     * Raw response body returned by the API.
     */
    private final String responseBody;

    /**
     * Creates a SeaTunnel client exception.
     *
     * @param message      error message
     * @param httpStatus   HTTP response status code
     * @param responseBody raw response body returned by the API
     * @param cause        original cause of the exception
     */
    public SeaTunnelClientException(String message, int httpStatus, String responseBody, Throwable cause) {
        super(message, cause);
        this.httpStatus = httpStatus;
        this.responseBody = responseBody;
    }
}