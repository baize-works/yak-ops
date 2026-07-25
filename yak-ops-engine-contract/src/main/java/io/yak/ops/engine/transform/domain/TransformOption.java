package io.yak.ops.engine.transform.domain;

import lombok.Data;

@Data
public abstract class TransformOption {

    private String fieldName;
    private String fieldType;
}
