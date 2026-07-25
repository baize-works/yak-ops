package io.yak.ops.engine.legacy.internal.vendor.exception;

import lombok.Getter;

/**
 * Exception thrown when calling LinkUp Engine APIs.
 *
 * <p>This exception wraps the HTTP status code, response body,
 * and the original cause returned from the LinkUp Engine client.</p>
 */
@Getter
public class LinkUpClientException extends RuntimeException {

    /**
     * HTTP response status code.
     */
    private final int httpStatus;

    /**
     * Raw response body returned by the API.
     */
    private final String responseBody;

    /**
     * Creates a LinkUp client exception.
     *
     * @param message      error message
     * @param httpStatus   HTTP response status code
     * @param responseBody raw response body returned by the API
     * @param cause        original cause of the exception
     */
    public LinkUpClientException(String message, int httpStatus, String responseBody, Throwable cause) {
        super(message, cause);
        this.httpStatus = httpStatus;
        this.responseBody = responseBody;
    }
}
