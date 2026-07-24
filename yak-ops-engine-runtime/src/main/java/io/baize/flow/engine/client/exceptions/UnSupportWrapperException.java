package io.baize.flow.engine.client.exceptions;

import lombok.NonNull;

public class UnSupportWrapperException extends RuntimeException {
    public UnSupportWrapperException(
            @NonNull String formName, @NonNull String label, @NonNull String typeName) {
        super(
                String.format(
                        "Form: %s, label: %s, typeName: %s not yet supported",
                        formName, label, typeName));
    }
}
