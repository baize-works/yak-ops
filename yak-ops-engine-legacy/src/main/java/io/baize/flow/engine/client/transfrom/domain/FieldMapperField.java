package io.baize.flow.engine.client.transfrom.domain;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class FieldMapperField extends TransformOption {
    private Integer key;
    private String targetFieldName;
    private String targetFieldType;
}
