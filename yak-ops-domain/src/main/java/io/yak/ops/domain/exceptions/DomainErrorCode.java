package io.yak.ops.domain.exceptions;

/** Error contract owned by the domain and implementable by outer adapters. */
public interface DomainErrorCode {
    int getCode();
    String getMsg();
}
