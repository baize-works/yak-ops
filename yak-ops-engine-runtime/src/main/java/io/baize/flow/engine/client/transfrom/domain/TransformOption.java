package io.baize.flow.engine.client.transfrom.domain;

import lombok.Data;

@Data
public abstract class TransformOption {

    private String fieldName;
    private String fieldType;
}
